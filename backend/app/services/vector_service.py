import chromadb
import numpy as np
from typing import List, Dict, Any
import uuid
import openai
import os
from dotenv import load_dotenv

load_dotenv()

try:
    from sentence_transformers import SentenceTransformer
    SENTENCE_TRANSFORMERS_AVAILABLE = True
except ImportError:
    SENTENCE_TRANSFORMERS_AVAILABLE = False

class VectorService:
    def __init__(self, chroma_client):
        self.client = chroma_client
        
        # Try to initialize OpenAI
        self.use_openai = False
        try:
            api_key = os.getenv('OPENAI_API_KEY')
            if api_key:
                self.openai_client = openai.OpenAI(api_key=api_key)
                self.embedding_model_name = 'text-embedding-3-small'
                self.use_openai = True
                print("OpenAI embedding service initialized")
            else:
                print("No OpenAI API key found")
        except Exception as e:
            print(f"Failed to initialize OpenAI: {e}")
        
        # Always initialize local model as fallback
        self.embedding_model = None
        if SENTENCE_TRANSFORMERS_AVAILABLE:
            try:
                self.embedding_model = SentenceTransformer('all-MiniLM-L6-v2')
                print("Local embedding model (all-MiniLM-L6-v2) initialized as fallback")
            except Exception as e:
                print(f"Failed to initialize local embedding model: {e}")
                self.embedding_model = None
        
        self.document_collection = self.client.get_or_create_collection(
            name="documents",
            metadata={"description": "Document embeddings for semantic search"}
        )
        
        self.chat_collection = self.client.get_or_create_collection(
            name="chat_history",
            metadata={"description": "Chat history embeddings for context retrieval"}
        )
    
    def _generate_embeddings(self, texts: List[str]) -> List[List[float]]:
        if self.use_openai:
            try:
                response = self.openai_client.embeddings.create(
                    model=self.embedding_model_name,
                    input=texts
                )
                return [embedding.embedding for embedding in response.data]
            except Exception as e:
                print(f"OpenAI embedding failed: {e}")
                # Fall back to local model
                if self.embedding_model:
                    return self.embedding_model.encode(texts).tolist()
                else:
                    raise Exception("No embedding service available")
        elif self.embedding_model:
            return self.embedding_model.encode(texts).tolist()
        else:
            raise Exception("No embedding service available")
    
    def add_document_chunks(self, document_id: str, chunks: List[str], metadata: List[Dict[str, Any]]):
        chunk_ids = [f"{document_id}_chunk_{i}" for i in range(len(chunks))]
        embeddings = self._generate_embeddings(chunks)
        
        for i, meta in enumerate(metadata):
            meta['document_id'] = document_id
            meta['chunk_index'] = i
        
        self.document_collection.add(
            embeddings=embeddings,
            documents=chunks,
            metadatas=metadata,
            ids=chunk_ids
        )
        
        return len(chunks)
    
    def search_documents(self, query: str, user_id: str, n_results: int = 5, document_id: str = None):
        query_embedding = self._generate_embeddings([query])
        
        if document_id:
            where_clause = {"$and": [{"user_id": user_id}, {"document_id": document_id}]}
        else:
            where_clause = {"user_id": user_id}
        
        results = self.document_collection.query(
            query_embeddings=query_embedding,
            n_results=n_results,
            where=where_clause,
            include=["documents", "metadatas", "distances"]
        )
        
        return {
            'documents': results['documents'][0] if results['documents'] else [],
            'metadatas': results['metadatas'][0] if results['metadatas'] else [],
            'distances': results['distances'][0] if results['distances'] else []
        }
    
    def add_chat_context(self, chat_id: str, user_id: str, question: str, answer: str, document_context: str = None):
        context_text = f"Question: {question}\nAnswer: {answer}"
        if document_context:
            context_text += f"\nContext: {document_context}"
        
        embedding = self._generate_embeddings([context_text])[0]
        
        self.chat_collection.add(
            embeddings=[embedding],
            documents=[context_text],
            metadatas=[{
                'chat_id': chat_id,
                'user_id': user_id,
                'question': question,
                'answer': answer,
                'has_document_context': bool(document_context)
            }],
            ids=[f"{chat_id}_{uuid.uuid4()}"]
        )
    
    def get_relevant_chat_history(self, query: str, chat_id: str, n_results: int = 3):
        query_embedding = self._generate_embeddings([query])
        
        results = self.chat_collection.query(
            query_embeddings=query_embedding,
            n_results=n_results,
            where={"chat_id": chat_id},
            include=["documents", "metadatas", "distances"]
        )
        
        return {
            'contexts': results['documents'][0] if results['documents'] else [],
            'metadatas': results['metadatas'][0] if results['metadatas'] else [],
            'distances': results['distances'][0] if results['distances'] else []
        }
    
    def delete_document_embeddings(self, document_id: str):
        try:
            results = self.document_collection.get(where={"document_id": document_id})
            if results['ids']:
                self.document_collection.delete(ids=results['ids'])
            return True
        except Exception as e:
            print(f"Error deleting document embeddings: {e}")
            return False
    
    def delete_chat_embeddings(self, chat_id: str):
        try:
            results = self.chat_collection.get(where={"chat_id": chat_id})
            if results['ids']:
                self.chat_collection.delete(ids=results['ids'])
            return True
        except Exception as e:
            print(f"Error deleting chat embeddings: {e}")
            return False
    
    def get_collection_stats(self):
        embedding_dim = 1536 if self.use_openai else 384  # OpenAI vs local model dimension
        return {
            'document_count': self.document_collection.count(),
            'chat_count': self.chat_collection.count(),
            'embedding_dimension': embedding_dim,
            'embedding_service': 'OpenAI' if self.use_openai else 'Local (all-MiniLM-L6-v2)'
        }
    
    def chunk_text(self, text: str, chunk_size: int = 1500, overlap: int = 300):
        chunks = []
        start = 0
        text_length = len(text)
        
        while start < text_length:
            end = start + chunk_size
            
            if end >= text_length:
                chunk = text[start:]
            else:
                last_space = text.rfind(' ', start, end)
                if last_space != -1 and last_space > start:
                    end = last_space
                chunk = text[start:end]
            
            chunks.append(chunk.strip())
            start = end - overlap
            
            if start >= text_length:
                break
        
        return chunks