FROM python:3.12-slim
WORKDIR /srv/quote-service
COPY quote-service/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY quote-service/ .
# sample drawings are used by the offline (EXTRACTOR=sidecar) demo mode
COPY samples/ /srv/samples/
ENV DATA_DIR=/data
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
