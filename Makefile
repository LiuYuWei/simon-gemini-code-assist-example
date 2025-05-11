deploy-cloud-run:
	@echo "Deploying to Cloud Run..."
ifndef GOOGLE_API_KEY
	$(error GOOGLE_API_KEY is not set. Please set it as an environment variable.)
endif
	gcloud run deploy simon-gemini-code-assist-example --source . --port 8000 --set-env-vars GOOGLE_API_KEY="$(GOOGLE_API_KEY)"
	@echo "Deployment complete."

build:
	@echo "Building the Docker image..."
	docker build -t simon-gemini-code-assist-example .
	@echo "Build complete."

run:
	@echo "Running the Docker container..."
	docker run -p 8000:8000 simon-gemini-code-assist-example
	@echo "Container is running on http://localhost:8000"