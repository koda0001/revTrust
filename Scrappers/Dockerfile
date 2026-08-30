FROM mcr.microsoft.com/playwright/python:v1.49.0-noble

WORKDIR /workspace

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

ENV PORT=8080
EXPOSE 8080

CMD ["functions-framework", "--target=trigger_weekly_job"]