import mongoose from "mongoose";
import { Playlist } from "../models/playlist.model";
import { asyncHandler } from "../utils/asyncHandler";
import { APIError } from "../utils/APIError";
import { APIResponse } from "../utils/APIResponse";
import { Video } from "../models/video.model";
import {isValidObjectId} from "mongoose";

const createPlaylist = asyncHandler(async (req, res) => {
    const {name, description} = req.body
    
    if(!name || !description){
        throw new APIError(400, "Name and description required for playlist")
    }

    const playlist = await Playlist.create({
        name:name,
        description:description,
        owner:req.user?._id,
    })

    if(!playlist){
        throw new APIError(500,"Failed to create playlist")
    }

    return res
    .status(200)
    .json(new APIResponse(200, playlist,"Playlist successfully created"))
})

const getUserPlaylists = asyncHandler(async (req, res) => {
    const {userId} = req.params

    const userPlaylists = await Playlist.aggregate([
        {
            $match:{
                owner: mongoose.Types.ObjectId(userId)
            }
        },
        {
            $lookup:{
                from:"videos",
                localField:"owner",
                foreignField:"_id",
                as:"videos"
            }
        },
        {
            $addFields:{
                totalVideos:{
                    $size:"$videos"
                },
                totalViews:{
                    $sum:"$videos.views"
                }
            }
        },
        {
            $project:{
                _id:1,
                name:1,
                description:1,
                totalVideos:1,
                totalViews:1,
                owner:1,
                updatedAt:1
            }
        }
    ]);

    return res
    .status(200)
    .json(new APIResponse(200,userPlaylists,"User playlists fetched successfully"))
})

const getPlaylistById = asyncHandler(async (req, res) => {
    const {playlistId} = req.params

    const playlist = await Playlist.findById(playlistId)

    if(!playlist){
        throw new APIError(404,"Playlist not found")
    }

    const playListVideos = await Playlist.aggregate([
        {
            $match:{
                _id: new mongoose.Types.ObjectId(playlistId)
            }
        },
        {
            $lookup:{
                from:"videos",
                localField:"videos",
                foreignField:"_id",
                as:"videos"
            }
        },
        {
            $match:{
                "video.isPublished":true
            }
        },
        {
            $lookup:{
                from:"users",
                localField:"owner",
                foreignField:"_id",
                as:"owner"
            }
        },
        {
            $addFields: {
                totalVideos: {
                    $size: "$videos"
                },
                totalViews: {
                    $sum: "$videos.views"
                },
                owner: {
                    $first: "$owner"
                }
            }
        },
        {
            $project: {
                name: 1,
                description: 1,
                createdAt: 1,
                updatedAt: 1,
                totalVideos: 1,
                totalViews: 1,
                videos: {
                    _id: 1,
                    "videoFile.url": 1,
                    "thumbnail.url": 1,
                    title: 1,
                    description: 1,
                    duration: 1,
                    createdAt: 1,
                    views: 1
                },
                owner: {
                    username: 1,
                    fullName: 1,
                    "avatar.url": 1
                }
            }
        }
    ])

    return res
    .status(200)
    .json(new APIResponse(200, playListVideos[0], "Playlist fetched successfully"))
})

const addVideoToPlaylist = asyncHandler(async (req, res) => {
    const { playlistId, videoId } = req.params;

    if (!isValidObjectId(playlistId) || !isValidObjectId(videoId)) {
        throw new APIError(400, "Invalid PlaylistId or videoId");
    }

    const playlist = await Playlist.findById(playlistId);
    const video = await Video.findById(videoId);

    if (!playlist) {
        throw new APIError(404, "Playlist not found");
    }
    if (!video) {
        throw new APIError(404, "video not found");
    }

    if ((playlist.owner?.toString() && video.owner.toString()) !==
        req.user?._id.toString()
    ) {
        throw new APIError(400, "only owner can add video to thier playlist");
    }

    const updatedPlaylist = await Playlist.findByIdAndUpdate(
        playlist?._id,
        {
            $addToSet: {
                videos: videoId,
            },
        },
        { new: true }
    );

    if (!updatedPlaylist) {
        throw new APIError(
            400,
            "failed to add video to playlist please try again"
        );
    }

    return res
        .status(200)
        .json(
            new APIResponse(
                200,
                updatedPlaylist,
                "Added video to playlist successfully"
            )
        );
});

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
    const {playlistId, videoId} = req.params
    if (!isValidObjectId(playlistId) || !isValidObjectId(videoId)) {
        throw new APIError(400, "Invalid PlaylistId or videoId");
    }

    const playlist = await Playlist.findById(playlistId);
    const video = await Video.findById(videoId);

    if (!playlist) {
        throw new APIError(404, "Playlist not found");
    }
    if (!video) {
        throw new APIError(404, "video not found");
    }

    if ((playlist.owner?.toString() && video.owner.toString()) !==
        req.user?._id.toString()
    ) {
        throw new APIError(400, "only owner can delete video from their playlist");
    }

    const updatedPlaylist = await Playlist.findByIdAndDelete(
        playlist?._id,
        {
            $pull: {
                videos: videoId,
            },
        },
        { new: true }
    );

    return res
        .status(200)
        .json(
            new APIResponse(
                200,
                updatedPlaylist,
                "Video deleted from playlist successfully"
            )
        );

})

const deletePlaylist = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    const playlist = await Playlist.findById(playlistId);

    if (!playlist) {
        throw new APIError(404, "Playlist not found");
    }

    if (playlist.owner?.toString() !==
        req.user?._id.toString()
    ) {
        throw new APIError(400, "only owner can delete their playlist");
    }

    const updatedPlaylist = await Playlist.findByIdAndDelete(
        playlist?._id,
        { new: true }
    );

    return res
        .status(200)
        .json(
            new APIResponse(
                200,
                updatedPlaylist,
                "Playlist deleted successfully"
            )
        );
})

const updatePlaylist = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    const {name, description} = req.body

    const playlist = await Playlist.findById(playlistId);

    if (!playlist) {
        throw new APIError(404, "Playlist not found");
    }

    if (playlist.owner?.toString() !==
        req.user?._id.toString()
    ) {
        throw new APIError(400, "only owner can delete their playlist");
    }

    const updatedPlaylist = await Playlist.findByIdAndUpdate(
        playlist?._id,
        {
            $set:{
                name: name,
                description:description
            }
        },
        { new: true }
    );

    return res
        .status(200)
        .json(
            new APIResponse(
                200,
                updatedPlaylist,
                "Playlist updated successfully"
            )
        );
})

export {createPlaylist, 
    getUserPlaylists, 
    getPlaylistById, 
    addVideoToPlaylist, 
    removeVideoFromPlaylist,
    deletePlaylist,
    updatePlaylist
}