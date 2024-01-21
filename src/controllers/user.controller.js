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

    const {fullname, email, username, password} = req.body
    
    // Check for verifying every required field exists or not
    if([fullname,email,username,password].some((field)=>field?.trim()==="")){
        throw new APIError(400, "All fields are required");
    }

    // Check if user already exists in DataBase
    if(User.findOne({$or: [{username}, {email}]})){
        throw new APIError(409, "User already exists");
    }
    console.log(req.files);
    const avatarLocalPath = req.files?.avatar[0]?.path;
    const coverImageLocalPath = req.files?.coverImage[0]?.path;
    
    if(!avatarLocalPath){
        throw new APIError(400,"Avatar file is required");
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    if(!avatar){
        throw new APIError(400, "Avatar file is required")
    }

    console.log(avatar);
    console.log(coverImage);


    // Main DB query done by creating a USER object
    const user = await User.create({fullname,
        avatar:avatar.url,
        coverImage:coverImage?.url || "",
        email,
        password,
        username:username.toLowerCase()
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