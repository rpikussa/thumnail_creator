// dependencies
import AWS from "aws-sdk";
import sharp from 'sharp';

AWS.config.update({ region: process.env.REGION_NAME });
const s3 = new AWS.S3({ apiVersion: "2006-03-01" });

export const s3_thumbnail_generator = async (event, context) => {
 
  // set thumbnail width. Resize will set the height automatically to maintain aspect ratio.
  const width  = parseInt(process.env.THUMBNAIL_SIZE);

  const srcBucket = event.Records[0].s3.bucket.name;
  
  const srcKey    = decodeURIComponent(event.Records[0].s3.object.key.replace(/\+/g, " "));
  const dstBucket = process.env.DESTINATION_BUCKET_NAME;
  const dstKey    = "resized-" + srcKey;

  // Infer the image type from the file suffix
  const typeMatch = srcKey.match(/\.([^.]*)$/);
  if (!typeMatch) {
    console.log("Could not determine the image type.");
    return;
  }

  // Check that the image type is supported
  const imageType = typeMatch[1].toLowerCase();
  if (imageType != "jpg" && imageType != "png") {
    console.log(`Unsupported image type: ${imageType}`);
    return;
  }
  
  // Get the image from the source bucket. GetObjectCommand returns a stream.
  try {
    const params = {
      Bucket: srcBucket,
      Key: srcKey
    };

    var currentImageObject = await s3.getObject(params)
    .promise()
    .then((data) => {
      return data

    }).catch((err) => {
      throw new Error(err)

    });
    var buffer = currentImageObject.Body;

  } catch (error) {
    console.log(error);
    return;
  }

  // Use the sharp module to resize the image and save in a buffer.
  try {    
    var output_buffer = await sharp(buffer).resize(width).toBuffer();

  } catch (error) {
    console.log(error);
    return;
  }

  // Upload the thumbnail image to the destination bucket
  
  const destparams = {
    Bucket: dstBucket,
    Key: dstKey,
    Body: output_buffer,
    ContentType: "image"
  };

  await s3.upload(destparams).promise()
  .then((success) => {
    console.log('Successfully resized ' + srcBucket + '/' + srcKey + ' and uploaded to ' + dstBucket + '/' + dstKey);
    return success
  })
  .catch((err) => {
    console.log(err);
    return;
  });
};
