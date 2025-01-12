module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  transform: {
    '^.+\\.tsx?$': 'ts-jest'
  },
  transformIgnorePatterns: ['/node_modules/(?!axios)'],
  setupFilesAfterEnv: ['<rootDir>/src/singleton.ts'],
  testPathIgnorePatterns: ['/node_modules/', '/dist/']
};
