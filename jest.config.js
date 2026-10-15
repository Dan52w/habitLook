module.exports = {
  testEnvironment: 'node',
  transform: { '^.+\\.(js|ts|tsx)$': 'babel-jest' },
  transformIgnorePatterns: ['node_modules/(?!(uuid)/)'],
};
