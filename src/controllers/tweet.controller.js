import mongoose, { isValidObjectId } from "mongoose"
import {Tweet} from "../models/tweet.model.js"
import {User} from "../models/user.model.js"
import {APIError} from "../utils/APIError.js"
import {APIResponse} from "../utils/APIResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const createTweet = asyncHandler(async (req, res) => {
    //TODO: create tweet
    const {content} = req.body;
    
    if(!content){
        throw new APIError(400,"content is required")
    }

    const tweet = await Tweet.create({
        content:content,
        owner:req.user?._id
    })

    if(!tweet){
        throw new APIError(500,"Tweet creation failed")
    }

    return res
    .status(200)
    .json(new APIResponse(200, tweet, "Tweet created successfully"))
})

const getUserTweets = asyncHandler(async (req, res) => {
    // TODO: get user tweets
    const {userId} = req.params

    if(!isValidObjectId(userId)){
        throw new APIError(400, "Invalid UserId")
    }

    const userTweets = await Tweet.aggregate([
        {
            $match:{
                owner:userId
            }
        },
        {
            $lookup:{
                from:"users",
                localField:"owner",
                foreignField:"_id",
                as:"ownerDetails",
                pipeline:[
                    {
                        $project:{
                            username:1,
                            "avatar.url":1
                        }
                    }
                ]
            }
        },
        {
            $lookup:{
                from:"likes",
                localField:"_id",
                foreignField:"tweet",
                as:"likeDetails",
                pipeline:[
                    {
                        $project:{
                            likedBy:1
                        }
                    }
                ]
            }
        },
        {
            $addFields:{
                likesCount:{
                    $size:"likeDetails"
                },
                ownerDetails:{
                    $first:"ownerDetails"
                }
            }
        },
        {
            $project:{
                content:1,
                ownerDetails:1,
                likesCount:1,
                createdAt:1
            }
        }
    ]);

    return res
    .status(200)
    .json(new APIResponse(200,userTweets,"User tweets fetched successfully"))
})

const updateTweet = asyncHandler(async (req, res) => {
    //TODO: update tweet
    const {content} = req.body
    const {tweetId} = req.params

    if(!isValidObjectId(tweetId)){
        throw new APIError(400, "Invalid TweetId")
    }

    if(!content){
        throw new APIError(400, "Content is missing")
    }

    const tweet = await Tweet.findById(tweetId);
    
    if (tweet?.owner.toString() !== req.user?._id.toString()) {
        throw new APIError(400, "only owner can edit thier tweet");
    }

    const updatedTweet = await Tweet.findByIdAndUpdate(
        tweetId,
        {
            $set:{
                content:content
            }
        },
        {new:true}
    );

    if(!updatedTweet){
        throw new APIError(500,"Tweet updation failed")
    }

    return res
    .status(200)
    .json(new APIResponse(200, updatedTweet, "Tweet updated successfully"));
})

const deleteTweet = asyncHandler(async (req, res) => {
    //TODO: delete tweet
    const { tweetId } = req.params;

    if (!isValidObjectId(tweetId)) {
        throw new APIError(400, "Invalid tweetId");
    }

    const tweet = await Tweet.findById(tweetId);

    if (!tweet) {
        throw new APIError(404, "Tweet not found");
    }

    if (tweet?.owner.toString() !== req.user?._id.toString()) {
        throw new APIError(400, "only owner can delete thier tweet");
    }

    await Tweet.findByIdAndDelete(tweetId);

    return res
    .status(200)
    .json(new APIResponse(200, {}, "Tweet deleted successfully"));
})

export {
    createTweet,
    getUserTweets,
    updateTweet,
    deleteTweet
}