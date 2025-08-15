import os
import PyPDF2
try:
    from docx import Document as DocxDocument
except ImportError:
    DocxDocument = None
try:
    from PIL import Image
    import pytesseract
except ImportError:
    Image = None
    pytesseract = None
from app.services.vector_service import VectorService
import logging
import openai
from dotenv import load_dotenv

load_dotenv()

try:
    from transformers import pipeline
    TRANSFORMERS_AVAILABLE = True
except ImportError:
    pipeline = None
    TRANSFORMERS_AVAILABLE = False

logger = logging.getLogger(__name__)

class DocumentProcessor:
    def __init__(self, chroma_client):
        self.vector_service = VectorService(chroma_client)
        
        # Try to initialize OpenAI
        self.use_openai = False
        try:
            api_key = os.getenv('OPENAI_API_KEY')
            if api_key:
                self.openai_client = openai.OpenAI(api_key=api_key)
                self.use_openai = True
                print("DocumentProcessor initialized with OpenAI integration")
            else:
                print("No OpenAI API key found, using local models")
        except Exception as e:
            print(f"Failed to initialize OpenAI for DocumentProcessor: {e}")
        
        # Always initialize local models as fallback
        if TRANSFORMERS_AVAILABLE:
            self._init_local_models()
        else:
            self.summarizer = None
            self.qa_pipeline = None
            self.classifier = None
            print("Transformers not available - local models disabled")
    
    def _init_local_models(self):
        try:
            self.summarizer = pipeline(
                "summarization",
                model="facebook/bart-large-cnn",
                device=-1
            )
            print("Local summarization model loaded")
        except Exception as e:
            print(f"Failed to load summarization model: {e}")
            self.summarizer = None
        
        try:
            self.qa_pipeline = pipeline(
                "question-answering",
                model="deepset/roberta-base-squad2",
                device=-1
            )
            print("Local QA model loaded")
        except Exception as e:
            print(f"Failed to load QA model: {e}")
            self.qa_pipeline = None
        
        try:
            self.classifier = pipeline(
                "zero-shot-classification",
                model="facebook/bart-large-mnli",
                device=-1
            )
            print("Local classification model loaded")
        except Exception as e:
            print(f"Failed to load classification model: {e}")
            self.classifier = None
    
    def extract_text_from_file(self, filepath, content_type):
        try:
            if content_type == 'application/pdf':
                return self._extract_text_from_pdf(filepath)
            elif content_type in ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword']:
                return self._extract_text_from_docx(filepath)
            elif content_type.startswith('text/'):
                return self._extract_text_from_txt(filepath)
            elif content_type.startswith('image/'):
                return self._extract_text_from_image(filepath)
            else:
                return "Unsupported file type for text extraction"
        except Exception as e:
            logger.error(f"Error extracting text from {filepath}: {e}")
            return f"Error extracting text: {str(e)}"
    
    def _extract_text_from_pdf(self, filepath):
        text = ""
        try:
            with open(filepath, 'rb') as file:
                pdf_reader = PyPDF2.PdfReader(file)
                for page in pdf_reader.pages:
                    text += page.extract_text() + "\n"
        except Exception as e:
            raise Exception(f"Failed to extract text from PDF: {str(e)}")
        return text.strip()
    
    def _extract_text_from_docx(self, filepath):
        if not DocxDocument:
            raise Exception("python-docx library not available")
        try:
            doc = DocxDocument(filepath)
            text = ""
            for paragraph in doc.paragraphs:
                text += paragraph.text + "\n"
        except Exception as e:
            raise Exception(f"Failed to extract text from DOCX: {str(e)}")
        return text.strip()
    
    def _extract_text_from_txt(self, filepath):
        try:
            with open(filepath, 'r', encoding='utf-8') as file:
                text = file.read()
        except UnicodeDecodeError:
            with open(filepath, 'r', encoding='latin-1') as file:
                text = file.read()
        except Exception as e:
            raise Exception(f"Failed to extract text from TXT: {str(e)}")
        return text.strip()
    
    def _extract_text_from_image(self, filepath):
        if not Image or not pytesseract:
            raise Exception("PIL or pytesseract library not available")
        try:
            image = Image.open(filepath)
            text = pytesseract.image_to_string(image)
        except Exception as e:
            raise Exception(f"Failed to extract text from image: {str(e)}")
        return text.strip()
    
    def generate_summary(self, text, max_length=150):
        if not text.strip():
            logger.info("Text empty, creating fallback summary")
            return self._generate_fallback_summary(text)
        
        text_length = len(text.split())
        logger.info(f"Generating summary for text with {text_length} words")
        
        if text_length < 50:
            logger.info("Document too short for summarization")
            return "Document too short for summarization"
        
        # Try OpenAI first
        if self.use_openai:
            try:
                # Truncate text if too long for OpenAI API
                if text_length > 3000:
                    words = text.split()
                    text = ' '.join(words[:3000])
                    logger.info(f"Text truncated to 3000 words")
                
                prompt = f"""Please provide a concise summary of the following document in about 2-3 sentences:

{text}

Summary:"""
                
                response = self.openai_client.chat.completions.create(
                    model="gpt-3.5-turbo",
                    messages=[
                        {"role": "system", "content": "You are a helpful assistant that creates concise document summaries."},
                        {"role": "user", "content": prompt}
                    ],
                    max_tokens=200,
                    temperature=0.3
                )
                
                summary = response.choices[0].message.content.strip()
                logger.info(f"Successfully generated OpenAI summary: {summary[:100]}...")
                return summary
                
            except Exception as e:
                logger.error(f"Error generating OpenAI summary: {e}")
                logger.info("Falling back to local model")
        
        # Try local model if OpenAI failed or not available
        if self.summarizer:
            try:
                # Truncate text for local model
                if text_length > 1024:
                    words = text.split()
                    text = ' '.join(words[:1024])
                    logger.info(f"Text truncated to 1024 words for local model")
                
                summary = self.summarizer(
                    text,
                    max_length=min(max_length, 130),
                    min_length=20,
                    do_sample=False
                )
                
                if summary and isinstance(summary, list) and len(summary) > 0:
                    if isinstance(summary[0], dict) and 'summary_text' in summary[0]:
                        result_text = summary[0]['summary_text']
                        logger.info(f"Successfully generated local summary: {result_text[:100]}...")
                        return result_text
                
            except Exception as e:
                logger.error(f"Error generating local summary: {e}")
        
        # Final fallback
        logger.info("Falling back to simple summary generation")
        return self._generate_fallback_summary(text)
    
    
    def _generate_fallback_summary(self, text):
        """Generate a simple summary by taking the first few sentences"""
        if not text or not text.strip():
            return "No content available for summary"
        
        sentences = text.split('.')[:3]  # Take first 3 sentences
        fallback_summary = '. '.join(sentence.strip() for sentence in sentences if sentence.strip())
        if fallback_summary:
            return fallback_summary + "."
        else:
            return f"Document contains {len(text.split())} words of content."
    
    def extract_key_insights(self, text):
        if not text.strip():
            return []
        
        # Try OpenAI first
        if self.use_openai:
            try:
                # Truncate text if too long
                if len(text.split()) > 2000:
                    words = text.split()
                    text = ' '.join(words[:2000])
                
                prompt = f"""Analyze the following document and identify key insights. For each insight, classify it into one of these categories:
- financial information
- legal terms  
- technical specifications
- important dates
- contact information
- action items
- risks and concerns
- opportunities
- conclusions

Return up to 5 insights in JSON format like this:
[{{"category": "category_name", "insight": "brief description", "confidence": 0.85}}]

Document:
{text}"""
                
                response = self.openai_client.chat.completions.create(
                    model="gpt-3.5-turbo",
                    messages=[
                        {"role": "system", "content": "You are a helpful assistant that analyzes documents and extracts key insights. Always respond with valid JSON."},
                        {"role": "user", "content": prompt}
                    ],
                    max_tokens=300,
                    temperature=0.2
                )
                
                import json
                insights_text = response.choices[0].message.content.strip()
                
                # Try to parse JSON response
                try:
                    insights = json.loads(insights_text)
                    return insights[:5] if isinstance(insights, list) else []
                except json.JSONDecodeError:
                    logger.warning("Failed to parse insights JSON, falling back to local model")
                    
            except Exception as e:
                logger.error(f"Error extracting insights with OpenAI: {e}")
        
        # Try local model if OpenAI failed or not available
        if self.classifier:
            try:
                categories = [
                    "financial information", "legal terms", "technical specifications",
                    "important dates", "contact information", "action items",
                    "risks and concerns", "opportunities", "conclusions"
                ]
                
                result = self.classifier(text, categories)
                
                insights = []
                for label, score in zip(result['labels'], result['scores']):
                    if score > 0.5:
                        insights.append({
                            'category': label,
                            'insight': f"Content related to {label}",
                            'confidence': round(score, 3)
                        })
                
                return insights[:5]
            except Exception as e:
                logger.error(f"Error extracting insights with local model: {e}")
        
        return []
    
    def answer_question(self, question, context, document_id=None):
        # Try OpenAI first
        if self.use_openai:
            try:
                # Optimize context length for OpenAI API limits
                if len(context) > 4000:
                    context = context[:4000]
                
                prompt = f"""Based on the following context, answer the question as accurately as possible. If the answer cannot be found in the context, say "I cannot find this information in the provided context."

Context:
{context}

Question: {question}

Answer:"""
                
                response = self.openai_client.chat.completions.create(
                    model="gpt-3.5-turbo",
                    messages=[
                        {"role": "system", "content": "You are a helpful assistant that answers questions based on provided context. Be accurate and cite information from the context when possible."},
                        {"role": "user", "content": prompt}
                    ],
                    max_tokens=300,
                    temperature=0.2
                )
                
                answer = response.choices[0].message.content.strip()
                
                # Estimate confidence based on answer content
                confidence = 0.8  # Default confidence for OpenAI responses
                if "cannot find" in answer.lower() or "not mentioned" in answer.lower():
                    confidence = 0.3
                elif len(answer) > 100:  # Detailed answers might be more confident
                    confidence = 0.9
                
                return {
                    'answer': answer,
                    'confidence': round(confidence, 3),
                    'context_used': context[:500] + "..." if len(context) > 500 else context,
                    'model': 'gpt-3.5-turbo'
                }
                
            except Exception as e:
                logger.error(f"Error answering question with OpenAI: {e}")
        
        # Try local model if OpenAI failed or not available
        if self.qa_pipeline:
            try:
                # Optimize context length for better QA performance
                if len(context) > 3000:
                    context = context[:3000]
                
                result = self.qa_pipeline(
                    question=question,
                    context=context,
                    max_answer_len=200,
                    max_seq_len=512,
                    doc_stride=128,
                    max_question_len=64
                )
                
                # Adjust confidence based on answer quality
                base_confidence = result['score']
                answer_length = len(result['answer'])
                adjusted_confidence = base_confidence
                if answer_length > 20:
                    adjusted_confidence = min(1.0, base_confidence * 1.1)
                if answer_length < 5:
                    adjusted_confidence = base_confidence * 0.9
                    
                return {
                    'answer': result['answer'],
                    'confidence': round(adjusted_confidence, 3),
                    'context_used': context[max(0, result['start']-100):result['end']+100],
                    'start_position': result['start'],
                    'end_position': result['end'],
                    'model': 'deepset/roberta-base-squad2'
                }
            except Exception as e:
                logger.error(f"Error answering question with local model: {e}")
        
        # Final fallback
        return {
            'answer': 'Question answering service not available',
            'confidence': 0.0,
            'context_used': context[:200] + "..." if len(context) > 200 else context,
            'model': 'fallback'
        }
    
    def process_document(self, document_id, filepath, content_type, user_id):
        try:
            extracted_text = self.extract_text_from_file(filepath, content_type)
            
            if not extracted_text or len(extracted_text.strip()) < 10:
                return {
                    'status': 'failed',
                    'error': 'No meaningful text could be extracted from the document'
                }
            
            summary = self.generate_summary(extracted_text)
            
            key_insights = self.extract_key_insights(extracted_text)
            
            chunks = self.vector_service.chunk_text(extracted_text)
            chunk_metadata = [
                {
                    'user_id': user_id,
                    'document_id': document_id,
                    'chunk_index': i,
                    'chunk_length': len(chunk)
                } for i, chunk in enumerate(chunks)
            ]
            
            embeddings_count = self.vector_service.add_document_chunks(
                document_id, chunks, chunk_metadata
            )
            
            return {
                'status': 'completed',
                'extracted_text': extracted_text,
                'summary': summary,
                'key_insights': key_insights,
                'chunks_created': len(chunks),
                'embeddings_stored': embeddings_count,
                'processing_metadata': {
                    'text_length': len(extracted_text),
                    'word_count': len(extracted_text.split()),
                    'chunks_count': len(chunks)
                }
            }
            
        except Exception as e:
            logger.error(f"Error processing document {document_id}: {e}")
            return {
                'status': 'failed',
                'error': str(e)
            }
    
    def search_documents(self, query, user_id, document_id=None, limit=5):
        return self.vector_service.search_documents(query, user_id, limit, document_id)
    
    def delete_document_data(self, document_id):
        return self.vector_service.delete_document_embeddings(document_id)