#!/usr/bin/env node

/**
 * Simple test script to verify the configuration validation system
 * This script tests the validation with various config files
 */

import { loadConfig } from './dist/lib/config/index.js';
import { promises as fs } from 'fs';
import path from 'path';

const testConfigs = [
  { file: 'test-configs/valid-minimal.yaml', shouldPass: true },
  { file: 'test-configs/valid-complete.yaml', shouldPass: true },
  { file: 'test-configs/invalid-missing-types.yaml', shouldPass: false },
  { file: 'test-configs/invalid-empty-types.yaml', shouldPass: false },
  { file: 'test-configs/invalid-bad-type-id.yaml', shouldPass: false },
  { file: 'test-configs/invalid-missing-description.yaml', shouldPass: false }
];

async function testValidation() {
  console.log('🧪 Testing Configuration Validation System\n');
  
  let passed = 0;
  let failed = 0;
  
  for (const test of testConfigs) {
    console.log(`Testing: ${test.file}`);
    
    try {
      // Copy test file to project root as .labcommitr.config.yaml
      const testContent = await fs.readFile(test.file, 'utf8');
      await fs.writeFile('.labcommitr.config.yaml', testContent);
      
      // Try to load the config
      const result = await loadConfig('.');
      
      if (test.shouldPass) {
        console.log(`✅ PASS: Config loaded successfully`);
        console.log(`   Types found: ${result.config.types.length}`);
        passed++;
      } else {
        console.log(`❌ FAIL: Expected validation error but config loaded`);
        failed++;
      }
      
    } catch (error) {
      if (!test.shouldPass) {
        console.log(`✅ PASS: Validation correctly rejected config`);
        console.log(`   Error: ${error.message.split('\\n')[0]}`);
        passed++;
      } else {
        console.log(`❌ FAIL: Expected config to be valid but got error`);
        console.log(`   Error: ${error.message}`);
        failed++;
      }
    }
    
    console.log('');
  }
  
  // Clean up
  try {
    await fs.unlink('.labcommitr.config.yaml');
  } catch (e) {
    // Ignore cleanup errors
  }
  
  console.log(`\n📊 Test Results:`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Success Rate: ${Math.round((passed / (passed + failed)) * 100)}%`);
  
  if (failed === 0) {
    console.log(`\n🎉 All validation tests passed!`);
    process.exit(0);
  } else {
    console.log(`\n💥 Some validation tests failed!`);
    process.exit(1);
  }
}

testValidation().catch(error => {
  console.error('Test script failed:', error);
  process.exit(1);
});
