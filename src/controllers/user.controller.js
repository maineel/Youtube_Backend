import {asyncHandler} from '../utils/asyncHandler.js';
import {APIError} from '../utils/APIError.js'
import { User } from '../models/user.model.js'
import { uploadOnCloudinary } from '../utils/cloudinary.js';
import { APIResponse } from '../utils/APIResponse.js';

const registerUser = asyncHandler(async(req,res) => {
    // get user details from frontend
    // Validation
    // check if user already exists: username || mail
    // check for images, check for avatar
    // upload them to cloudinary, avatar
    // create user object - create entry in db
    // remove password and refresh token field from response
    // check for user creation
    // return res

    const {fullName, email, userName, password} = req.body
    
    // Check for verifying every required field exists or not
    if([fullName,email,userName,password].some((field)=>field?.trim()==="")){
        throw new APIError(400, "All fields are required");
    }

    // Check if user already exists in DataBase
    if( await User.findOne({$or: [{userName}, {email}]})){
        throw new APIError(409, "User already exists");
    }

    // console.table(req.files);
    const avatarLocalPath = req.files?.avatar[0]?.path;
    // const coverImageLocalPath = req.files?.coverImage[0]?.path;
    
    let coverImageLocalPath;
    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length>0){
        coverImageLocalPath = req.files.coverImage[0].path;
    }

    if(!avatarLocalPath){
        throw new APIError(400,"Avatar file is required");
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    if(!avatar){
        throw new APIError(400, "Avatar file is required")
    }
    
    // console.log(avatar);
    // console.log(coverImage);


    // Main DB query done by creating a USER object
    const user = await User.create({fullName,
        avatar:avatar.url,
        coverImage:coverImage?.url || "",
        email,
        password,
        userName:userName.toLowerCase()
    })

    const createdUser = await User.findById(user._id).select("-password -refreshToken");

    if(!createdUser){
        throw new APIError(500, "Something went wrong while registering user");
    }

    return res.status(201).json(
        new APIResponse(200,createdUser,"User registered sucessfully")
    );
})

export {registerUser}