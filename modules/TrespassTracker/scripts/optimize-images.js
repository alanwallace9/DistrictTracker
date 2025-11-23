#!/usr/bin/env node

/**
 * Image Optimization Script for TrespassTracker
 *
 * This script optimizes all images stored as base64 data URLs in the database:
 * - Resizes to 400x400px
 * - Converts to WebP format at 75% quality
 * - Uses 'attention' cropping strategy to intelligently focus on faces, skin tones, and eyes
 * - Expected ~40-50% file size reduction
 */

const sharp = require('sharp');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

// Supabase configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: Missing Supabase credentials in .env.local');
  console.error('Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Optimization settings
const TARGET_SIZE = 400; // 400x400px
const QUALITY = 75; // 75% quality for WebP
const CROP_POSITION = 'attention'; // Smart cropping: focuses on faces, skin tones, and high-detail areas

/**
 * Convert base64 data URL to Buffer
 */
function dataUrlToBuffer(dataUrl) {
  const base64Data = dataUrl.split(',')[1];
  return Buffer.from(base64Data, 'base64');
}

/**
 * Convert Buffer to base64 data URL
 */
function bufferToDataUrl(buffer, format = 'webp') {
  const base64 = buffer.toString('base64');
  return `data:image/${format};base64,${base64}`;
}

/**
 * Optimize a single image
 */
async function optimizeImage(dataUrl) {
  try {
    // Convert data URL to buffer
    const inputBuffer = dataUrlToBuffer(dataUrl);

    // Get original image info
    const metadata = await sharp(inputBuffer).metadata();
    const originalSize = inputBuffer.length;
    const originalFormat = metadata.format;

    // Optimize image
    const outputBuffer = await sharp(inputBuffer)
      .resize(TARGET_SIZE, TARGET_SIZE, {
        fit: 'cover',
        position: CROP_POSITION, // Top cropping to keep faces visible
      })
      .webp({ quality: QUALITY })
      .toBuffer();

    // Convert back to data URL
    const optimizedDataUrl = bufferToDataUrl(outputBuffer, 'webp');
    const optimizedSize = outputBuffer.length;
    const savings = ((originalSize - optimizedSize) / originalSize * 100).toFixed(1);

    return {
      dataUrl: optimizedDataUrl,
      originalSize,
      optimizedSize,
      savings,
      originalFormat,
    };
  } catch (error) {
    console.error('Error optimizing image:', error.message);
    return null;
  }
}

/**
 * Main optimization function
 */
async function optimizeAllImages() {
  console.log('🚀 Starting image optimization...\n');

  try {
    // Fetch all records with images
    const { data: records, error } = await supabase
      .from('trespass_records')
      .select('id, first_name, last_name, photo_url')
      .not('photo_url', 'is', null)
      .not('photo_url', 'eq', '');

    if (error) {
      throw error;
    }

    if (!records || records.length === 0) {
      console.log('ℹ️  No records with images found.');
      return;
    }

    console.log(`📸 Found ${records.length} records with images\n`);

    let totalOriginalSize = 0;
    let totalOptimizedSize = 0;
    let successCount = 0;
    let errorCount = 0;

    // Process each record
    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      const progress = `[${i + 1}/${records.length}]`;

      console.log(`${progress} Processing: ${record.first_name} ${record.last_name}`);

      // Skip if not a base64 data URL
      if (!record.photo_url.startsWith('data:image')) {
        console.log(`  ⚠️  Skipping (not a data URL)\n`);
        continue;
      }

      // Optimize the image
      const result = await optimizeImage(record.photo_url);

      if (!result) {
        console.log(`  ❌ Failed to optimize\n`);
        errorCount++;
        continue;
      }

      totalOriginalSize += result.originalSize;
      totalOptimizedSize += result.optimizedSize;

      console.log(`  📊 ${result.originalFormat.toUpperCase()} → WebP`);
      console.log(`  💾 ${(result.originalSize / 1024).toFixed(1)}KB → ${(result.optimizedSize / 1024).toFixed(1)}KB (${result.savings}% savings)`);

      // Update the record
      const { error: updateError } = await supabase
        .from('trespass_records')
        .update({ photo_url: result.dataUrl })
        .eq('id', record.id);

      if (updateError) {
        console.log(`  ❌ Failed to update database: ${updateError.message}\n`);
        errorCount++;
        continue;
      }

      console.log(`  ✅ Optimized and updated\n`);
      successCount++;
    }

    // Summary
    console.log('━'.repeat(50));
    console.log('📊 OPTIMIZATION SUMMARY');
    console.log('━'.repeat(50));
    console.log(`Total records processed: ${records.length}`);
    console.log(`✅ Successfully optimized: ${successCount}`);
    console.log(`❌ Errors: ${errorCount}`);
    console.log(`\n💾 Total original size: ${(totalOriginalSize / 1024).toFixed(1)}KB`);
    console.log(`💾 Total optimized size: ${(totalOptimizedSize / 1024).toFixed(1)}KB`);

    if (totalOriginalSize > 0) {
      const totalSavings = ((totalOriginalSize - totalOptimizedSize) / totalOriginalSize * 100).toFixed(1);
      console.log(`💰 Total savings: ${totalSavings}%`);
      console.log(`📉 Bandwidth reduced by: ${((totalOriginalSize - totalOptimizedSize) / 1024).toFixed(1)}KB`);
    }

    console.log('\n✨ Optimization complete!');

  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
    process.exit(1);
  }
}

// Run the script
optimizeAllImages()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Unhandled error:', error);
    process.exit(1);
  });
