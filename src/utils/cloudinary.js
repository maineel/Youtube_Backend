import {v2 as cloudinary} from 'cloudinary';
import fs from "fs"

cloudinary.config({ 
  cloud_name: PROCESS.ENV.CLOUDINARY_CLOUD_NAME, 
  api_key: PROCESS.ENV.CLOUDINARY_API_KEY, 
  api_secret: PROCESS.ENV.CLOUDINARY_API_SECRET  
});

const uploadOnCloudinary = async (localfilepath) => {
    try {
        if(!localfilepath) return null;
        const response = await cloudinary.uploader.upload(localfilepath, {
            resource_type: "auto"
        })
        console.log("File uploaded");
        console.log(response.url);
        return response;
    } catch (error) {
        fs.unlinkSync(localfilepath) // Removes locally saved file from the server as upload operation got failed
        return error;
    }
}