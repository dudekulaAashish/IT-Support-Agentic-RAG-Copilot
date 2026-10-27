# IT-Support-Agentic-RAG-Copilot

conda create -n project python=3.11 -y 

conda activate project 

pip install -r requirements.txt 

## Run the app

Start the FastAPI server from the project root:

```powershell
uvicorn app.main:app --reload
```

Open [http://127.0.0.1:8000](http://127.0.0.1:8000) for the chat interface. Set the API keys in `.env` before asking questions. To add a document to the knowledge base, use the upload panel and provide the configured `ADMIN_API_KEY`.
