FROM python:3.12-slim
ENV PYTHONUNBUFFERED=1 PIP_NO_CACHE_DIR=1
RUN useradd -m -u 1000 app
WORKDIR /home/app/backend
COPY --chown=app requirements.txt .
RUN pip install -r requirements.txt
COPY --chown=app app ./app
USER app
# Port 7860 is the Hugging Face Spaces default; override with PORT elsewhere.
ENV PORT=7860
EXPOSE 7860
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT}"]
