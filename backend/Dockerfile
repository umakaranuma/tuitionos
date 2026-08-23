FROM python:3.12-slim
WORKDIR /app
RUN apt-get update && apt-get install -y pkg-config default-libmysqlclient-dev build-essential libpango1.0-dev libcairo2-dev && rm -rf /var/lib/apt/lists/*
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
RUN chmod +x docker-entrypoint.sh
EXPOSE 8000
CMD ["./docker-entrypoint.sh"]
