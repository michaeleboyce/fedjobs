#!/usr/bin/env bash
# Integration test runner for the crawler package

# Set default mode
MODE=${1:-mock}

# Define configuration based on mode
if [ "$MODE" == "real" ]; then
  USE_MOCKS=false
  USE_REAL_CRAWLER=true
  USE_REAL_PARSER=true
  USE_REAL_AI=true
elif [ "$MODE" == "mock" ]; then
  USE_MOCKS=true
  USE_REAL_CRAWLER=false
  USE_REAL_PARSER=false
  USE_REAL_AI=false
else
  echo "Invalid mode: $MODE. Available modes: mock, real"
  exit 1
fi

# Set test URL and timeout
TEST_URL="https://openai.com/careers/search/?l=6252b4ed-714d-469a-a970-7a13101bac9d"
TEST_TIMEOUT=30000

# Log configuration
echo "Running integration tests in $MODE mode..."
echo "Starting tests with configuration:"
echo "MODE=$MODE"
echo "USE_MOCKS=$USE_MOCKS"
echo "USE_REAL_CRAWLER=$USE_REAL_CRAWLER"
echo "USE_REAL_PARSER=$USE_REAL_PARSER"
echo "USE_REAL_AI=$USE_REAL_AI"
echo "TEST_URL=$TEST_URL"
echo "TEST_TIMEOUT=$TEST_TIMEOUT"

# Debug directory structure
echo "Current directory: $(pwd)"
echo "Test files in __tests__/integration:"
ls -la __tests__/integration/

# Run the tests with the configuration
# Explicitly specify the test file that we know exists
INTEGRATION_TEST_MODE=$MODE \
USE_MOCKS=$USE_MOCKS \
USE_REAL_CRAWLER=$USE_REAL_CRAWLER \
USE_REAL_PARSER=$USE_REAL_PARSER \
USE_REAL_AI=$USE_REAL_AI \
TEST_URL=$TEST_URL \
TEST_TIMEOUT=$TEST_TIMEOUT \
pnpm vitest run --config ./vitest.config.ts "__tests__/integration/openai-crawl.test.ts"