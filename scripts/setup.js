const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Setting up SecureChain project...');

// Install dependencies
console.log('📦 Installing dependencies...');
exec('npm install', (error, stdout, stderr) => {
  if (error) {
    console.error(`❌ Error installing dependencies: ${error}`);
    return;
  }
  
  console.log('✅ Dependencies installed successfully');
  
  // Create .env file if it doesn't exist
  const envPath = path.join(__dirname, '..', '.env');
  if (!fs.existsSync(envPath)) {
    console.log('📝 Creating .env file...');
    fs.copyFileSync(path.join(__dirname, '..', '.env.example'), envPath);
    console.log('✅ .env file created. Please update it with your configuration.');
  }
  
  // Create artifacts directory for compiled contracts
  const artifactsPath = path.join(__dirname, '..', 'artifacts');
  if (!fs.existsSync(artifactsPath)) {
    fs.mkdirSync(artifactsPath, { recursive: true });
    console.log('✅ Artifacts directory created');
  }
  
  // Create cache directory
  const cachePath = path.join(__dirname, '..', 'cache');
  if (!fs.existsSync(cachePath)) {
    fs.mkdirSync(cachePath, { recursive: true });
    console.log('✅ Cache directory created');
  }
  
  console.log('🎉 Setup completed successfully!');
  console.log('\n📋 Next steps:');
  console.log('1. Update your .env file with your configuration');
  console.log('2. Run "npm run compile" to compile the smart contracts');
  console.log('3. Run "npm test" to run the test suite');
  console.log('4. Run "npm run dev" to start the development server');
  console.log('\n📚 For more information, check the README.md file');
});
