from app.services.ingestion import load_file, chunk_documents 
from pathlib import Path 
from app.rag.vectore_store import add_documents

docs = load_file(Path("data/sample_kb/company_it_handbook.md"))
chunks = chunk_documents(docs)

print(len(chunks))