import {asyncHandler} from '../utils/asyncHandler.js';
import {APIError} from '../utils/APIError.js'
import { User } from '../models/user.model.js'
import { uploadOnCloudinary } from '../utils/cloudinary.js';
import { APIResponse } from '../utils/APIResponse.js';
import jwt from "jsonwebtoken"

// Custom functions
const generateAccessAndRefreshTokens = async(userId) => {
    try {
        const user = await User.findById(userId);
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        user.refreshToken = refreshToken;
        await user.save({validateBeforeSave:false})
        console.log(user);
        return {accessToken,refreshToken};
    } catch (error) {
        // console.log(error);
        throw new APIError(500, "Something went wrong while generating refresh and access tokens")
    }
}

// Endpoints
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
    if(await User.findOne({$or: [{userName}, {email}]})){
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

const loginUser = asyncHandler(async(req,res) => {
    // get user details from frontend
    // Validate and check if user exists
    // if user validated then send access and refresh token to user
    // send them in cookies

    const {email,userName,password} = req.body
    // console.log(email);
    if(!userName && !email){
        throw new APIError(400,"username or email is required")
    }

    const user = await User.findOne({$or:[{userName},{email}]});

    if(!user){
        throw new APIError(404, "User does not exist");
    }
    const passwordCorrect = await user.isPasswordCorrect(password);
    if(!passwordCorrect){
        throw new APIError(401, "Password Incorrect");
    }
        
    console.log(user);
    const {accessToken, refreshToken} = await generateAccessAndRefreshTokens(user._id)

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

    const options = {httpOnly:true,secure:true} // Options configuration for cookies

    return res
    .status(200)
    .cookie("accessToken",accessToken,options)
    .cookie("refreshToken",refreshToken,options)
    .json(
        new APIResponse(200, {user: loggedInUser,accessToken,refreshToken},"User logged in successfully!")
    )
})

const logoutUser = asyncHandler(async(req,res) => {
    await User.findByIdAndUpdate(req.user._id,
        {
            $set: {refreshToken:undefined}
        },
        {
            new:true
        }
    )
    const options = {
        httpOnly:true,
        secure:true
    }

    return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken",options)
    .json(new APIResponse(200, {}, "User logged out"))
})

const refreshAccessToken = asyncHandler(async(req,res) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken
    if(!incomingRefreshToken){
        throw new APIError(401,"Unauthorized request")
    }

    try {
        const decodedToken = jwt.verify(incomingRefreshToken,process.env.REFRESH_TOKEN_SECRET);
        
        const user = await User.findById(decodedToken?._id);
    
        if(!user){
            throw new APIError(401, "Invalid refresh token");
        }
    
        if(incomingRefreshToken !== user?.refreshToken){
            throw new APIError(401, "Refresh token expired")
        }
    
        const options = {
            httpOnly:true,
            secure:true
        }
    
        const {newAccessToken,newRefreshToken} = await generateAccessAndRefreshTokens(user._id);
    
        return res
        .status(200)
        .cookie("accessToken",newAccessToken,options)
        .cookie("refreshToken",newRefreshToken,options)
        .json(new APIResponse(200, {newAccessToken, newRefreshToken}, "Access token refreshed"))
    } catch (error) {
        throw new APIError(401, error?.message && "Invalid refresh token")
    }
})

const changeCurrentPassword = asyncHandler(async(req,res) =>{
    const {oldPassword,newPassword} = req.body
    
    const user = await User.findById(req.user?._id)

    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

    if(!isPasswordCorrect){
        throw new APIError(400, "Invalid old password")
    }

    user.password = newPassword
    await user.save({validateBeforeSave:false})

    return res
    .status(200)
    .json(new APIResponse(200, "Password changed successfully!"))

})

const getCurrentUser = asyncHandler(async(req,res) => {
    return res
    .status(200)
    .json(new APIResponse(200, req.user.select("-password"), "Current user fetched successfully"))
})

const updateAccountDetails = asyncHandler(async(req,res) => {
    const {fullName, email} = req.body
    if(!fullName || !email ){
        throw new APIError(400, "All fields are required")
    }

    const user = await User.findByIdAndUpdate(req.user?._id, {
        $set:{
            fullName: fullName,
            email: email
        }
    }, {new:true}
    ).select("-password")

    return res
    .status(200)
    .json(new APIResponse(200, user, "Account details updated successfully"))
})

const updateUserAvatar = asyncHandler(async(req,res) => {
    const avatarLocalPath = req.file?.path;
    if(!avatarLocalPath){
        throw new APIError(400, "Avatar file is missing")
    }

    // const oldAvatar = avatar.url
    // console.log(oldAvatar);

    const avatar = await uploadOnCloudinary(avatarLocalPath);
    
    if(!avatar.url){
        throw new APIError(400,"Error while uploading avatar")
    }

    const user = await User.findByIdAndUpdate(req.user?._id, {
        $set:{
            avatar:avatar.url
        }
    }, {new:true}
    ).select("-password");

    return res
    .status(200)
    .json(new APIResponse(200, user, "Avatar updated"))
})

const updateUserCoverImage = asyncHandler(async(req,res) => {
    const coverImageLocalpath = req.file?.path
    if(!coverImageLocalpath){
        throw new APIError(400, "Cover image file is missing")
    }

    const coverImage = await uploadOnCloudinary(coverImageLocalpath);
    
    if(!coverImage.url){
        throw new APIError(400,"Error while uploading cover image")
    }

    const user = await User.findByIdAndUpdate(req.user?._id, {
        $set:{
            coverImage:coverImage.url
        }
    }, {new:true}
    ).select("-password")
    
    return res
    .status(200)
    .json(new APIResponse(200, user, "Cover image updated"))
})

const getUserChannelProfile = asyncHandler(async(req,res) => {
    const {userName} = req.params

    if(!userName?.trim()){
        throw new APIError(400, "Username is missing")
    }

    const channel = await User.aggregate([
        {
            $match:{
                userName:userName?.toLowerCase()
            }
        },
        {
            $lookup:{
                from:"subscriptions",
                localField:"_id",
                foreignField:"channel",
                as:"subscribers"
            }
        },
        {
            $lookup:{
                from:"subscriptions",
                localField:"_id",
                foreignField:"subscriber",
                as:"subscribedTo"

            }
        },
        {
            $addFields:{
                subscribersCount:{
                    $size: "subscribers"
                },
                channelsSubscribedToCount:{
                    $size:"subscribedTo"
                },
                isSubscribed:{
                    $cond:{
                        if:{$in: [req.user?._id, "$subcribers.subscriber"]},
                        then:true,
                        else:false
                    } 
                }
            }
        },
        {
            $project:{
                fullName:1,
                userName:1,
                subscribersCount:1,
                channelsSubscribedToCount:1,
                isSubscribed:1,
                avatar:1,
                coverImage:1,
                email:1
            }
        }
    ])
    console.log(channel);

    if(!channel?.length){
        throw new APIError(404, "Channel does not exist")
    }

    return res
    .status(200)
    .json(new APIResponse(200,channel[0],"User channel fetched successfully"))
})

const getWatchHistory = asyncHandler(async(req,res) => {
    const user = await User.aggregate([
        {
            $match:{
                _id: new mongoose.Types.ObjectId(req.user._id)
            }
        },
        {
            $lookup:{
                from:"videos",
                localField:"watchHistory",
                foreignField:"_id",
                as:"watchHistory",
                pipeline:[
                    {
                        $lookup:{
                            from:"users",
                            localField:"owner",
                            foreignField:"_id",
                            as:"owner",
                            pipeline:[
                                {
                                    $project:{
                                        fullName:1,
                                        userName:1,
                                        avatar:1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields:{
                            owner:{
                                $first:"$owner"
                            }
                        }
                    }
                ]
            }
        }
    ])
    return res
    .status(200)
    .json( new APIResponse(200, user[0].watchHistory, "Watch history fetched"))
})


export {
    registerUser, 
    loginUser, 
    logoutUser, 
    refreshAccessToken, 
    changeCurrentPassword, 
    getCurrentUser, 
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
    getUserChannelProfile,
    getWatchHistory
}