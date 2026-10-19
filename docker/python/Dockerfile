# Base Python Runtime for BotCloud Containers
ARG PYTHON_VERSION=3.12
FROM python:${PYTHON_VERSION}-slim

# Install system utilities and build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    git \
    ffmpeg \
    libffi-dev \
    libopus-dev \
    build-essential \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Create non-root bot user for strict container isolation
RUN groupadd -g 1000 botuser && \
    useradd -u 1000 -g botuser -m -s /bin/bash botuser

# Setup isolated working directory
WORKDIR /server
RUN chown -R botuser:botuser /server

USER botuser
ENV PATH="/home/botuser/.local/bin:${PATH}"
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

# Container default entrypoint executes user startup command
CMD ["python", "bot.py"]
