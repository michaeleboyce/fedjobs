#!/bin/bash
# packages/crawler/run-integration-tests.sh

# Set default mode if not provided
MODE=${1:-"mock"}

if [ "$MODE" != "mock" ] && [ "$MODE" != "real" ]; then
  echo "Error: Mode must be either 'mock' or 'real'"
  echo "Usage: ./run-integration-tests.sh [mock|real]"
  exit 1
fi

echo "Running integration tests in $MODE mode..."

# Set environment variables for test configuration
export INTEGRATION_TEST_MODE="$MODE"

if [ "$MODE" == "real" ]; then
  export USE_MOCKS="false"
  export USE_REAL_CRAWLER="true"
  export USE_REAL_PARSER="true"
  export USE_REAL_AI="true"
  export TEST_TIMEOUT="300000"  # 5 minutes for real tests
else
  export USE_MOCKS="true"
  export USE_REAL_CRAWLER="false"
  export USE_REAL_PARSER="false"
  export USE_REAL_AI="false"
  export TEST_TIMEOUT="30000"  # 30 seconds for mock tests
fi

# Set the test URL for OpenAI careers
export TEST_URL="https://openai.com/careers/search/?l=6252b4ed-714d-469a-a970-7a13101bac9d"

# Run the tests with vitest
echo "Starting tests with configuration:"
echo "MODE=$MODE"
echo "USE_MOCKS=$USE_MOCKS"
echo "USE_REAL_CRAWLER=$USE_REAL_CRAWLER"
echo "USE_REAL_PARSER=$USE_REAL_PARSER"
echo "USE_REAL_AI=$USE_REAL_AI"
echo "TEST_URL=$TEST_URL"
echo "TEST_TIMEOUT=$TEST_TIMEOUT"

# Run the tests using npx vitest
npx vitest run --config ./vitest.config.ts "__tests__/integration/openai-crawl.test.ts"

# Get exit code
TEST_EXIT_CODE=$?

# Report results
if [ $TEST_EXIT_CODE -eq 0 ]; then
  echo "✅ Tests completed successfully!"
else
  echo "❌ Tests failed with exit code $TEST_EXIT_CODE"
fi

exit $TEST_EXIT_CODE