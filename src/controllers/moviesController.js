const path = require('path');
const db = require('../database/models');
const sequelize = db.sequelize;
const { Op } = require("sequelize");
const moment = require('moment');
const { createError, getUrl } = require ('../helpers');


const moviesController = {
    list: async (req, res) => {

        const { limit, order, offset } = req.query;
        const fields = ['title', 'rating', 'id', 'release_date', 'length', 'awards'];

        try {

            if(order && !fields.includes(order)) 
            throw createError(400, `Solo se puede ordernar por los campos ${fields.join(', ')}`);
                
            const total = await db.Movie.count();
            const movies = await db.Movie.findAll({
                    attributes: {
                        exclude: ['created_at', 'updated_at']
                    },
                    include: [
                        {
                            association: 'genre',
                            attributes: {
                                exclude: ['created_at', 'updated_at']
                            }
                        },
                        {
                            association: 'actors',
                            attributes: {
                                exclude: ['created_at', 'updated_at']
                            }
                        }
                    ],
                    limit: limit ? +limit : 5,
                    offset: offset ? +offset : 0,
                    order: [ order ? order : 'id']
                });
            
            movies.forEach(movie => {
                    movie.setDataValue('link', `${getUrl(req)}/${movie.id}`);
                });

            return res.status(200).json({
                    ok: true,
                    meta: {
                        status: 200
                    },
                    data: {
                        perPage: movies.length,
                        total,
                        movies
                    }
                });
        }
        catch(error){
            console.log(error);
            return res.status(error.status || 500).json({
                    ok: false,
                    msg: error.message
                });
        }
    },
    getById: async (req, res) => {

        const { id } = req.params;

        try {
            if(isNaN(id)) {
                throw createError(400, 'El ID debe ser un número entero positivo.')
            }

            const movie = await db.Movie.findByPk(id, 
                { 
                    include: [{
                        association: 'genre',
                        atributes: {
                            exclude: ['created_at', 'updated_at']
                        }
                    },
                    {
                        association: 'actors',
                        attributes: {
                            exclude: ['created_at', 'updated_at']
                        }
                    }],
                    atributes: {
                        exclude: ['created_at', 'updated_at', 'genre_id']
                    }
                });
            
            if(!movie) {
            throw createError(404, 'No se existe una película con esa ID.');
            }

            movie.release_date = moment(movie.release_date).format('DD/MM/YYYY');

            console.log(getUrl(req));

            return res.status(200).json({
                    ok: true,
                    meta: {
                        status: 200
                    },
                    data: {
                        movie
                    }
                });
        } 
        catch (error){
            console.log(error);

            return res.status(error.status || 500).json({
                    ok: false,
                    msg: error.message
                });
            }
    },
    newest: async (req, res) => {

        const { limit } = req.query;

        const options = {
            order: [ ['release_date', 'DESC'] ],
            include:
                [{
                        association: 'genre',
                        attributes: { exclude: ['created_at', 'updated_at'] }
                    },
                    {
                        association: 'actors',
                        attributes: { exclude: ['created_at', 'updated_at'] }
                    }],
            attributes: { 
                exclude: ['created_at', 'updated_at', 'genre_id']},
            limit: limit ? +limit : 5,
            order: [['release_date']]
        };

        try {
            const movies = await db.Movie.findAll(options);

            const moviesModify = movies.map(movie => {
                return{
                    ...movie.dataValues,
                    link: `${getUrlBase(req)}/${movie.id}`
                }
            });

            return res.status(200).json({
                    ok: true,
                    meta: {
                        status: 200
                    },
                    data: {
                        moviesModify
                    }
                });
        } 
        catch (error) {
            console.log(error);
            return res.status(error.status || 500).json({
                    ok: false,
                    msg: error.message
                });
        }
    },
    recommended: async (req, res) => {

        const { limit } = req.query;

        const options = {
            where: { 
                rating: {[db.Sequelize.Op.gte] : 8} },
            order: [ ['rating', 'DESC'] ],
            include: [{
                        association: 'genre',
                        attributes: { exclude: ['created_at', 'updated_at'] }
                    },
                    {
                        association: 'actors',
                        attributes: { exclude: ['created_at', 'updated_at'] }
                    }
                ],
            attributes: { 
                exclude: ['created_at', 'updated_at', 'genre_id']
            },
            limit: limit ? +limit : 5
        };

        try {
            const movies = await db.Movie.findAll(options); 
            
            movies.forEach(movie => {
                    movie.setDataValue('link', `${helpers.getUrl(req)}/${movie.id}`);
                });

            return res.status(200).json({
                    ok: true,
                    meta: {
                        status: 200
                    },
                    data: {
                        movies
                    }
                });
        } 
        catch (error) {
            console.log(error);

            return res.status(error.status || 500).json({             
                    ok: false,
                    msg: error.message
                });
        }
    },
    create: async (req,res) => {

        const { title, rating, awards, release_date, length, genre_id } = req.body;

        let errors = [];

        try {

            for (const key in req.body) {
                if(!req.body[key]) {
                    errors = [{
                        field: key,
                        msg: `El campo ${key} es obligatorio.`
                    }]
                }
            }

            if(errors.length > 0) {
                throw createError(400, 'Ups... Hay errores :c');
            }

            const movie = await db.Movie.create({
                title: title?.trim(),
                    rating,
                    awards,
                    release_date,
                    length,
                    genre_id
                });

            return res.status(201).json({
                    ok: true,
                    meta: {
                        status: 201
                    },
                    data: {
                        movie
                    }
                });
        } 
        catch (error) {
            const showErrors = error.errors.map(error => {
                    return {
                        path: error.path, 
                        message: error.message
                    }
                })
                
            console.log(showErrors);

            return res.status(error.status || 500).json({
                    ok: false,
                    msg: showErrors
                });
        }
    },
    update: async (req,res) => {

        let {title, rating, awards, release_date, length, genre_id} = req.body;

        try {
            let movieId = req.params.id;
            let movie = await db.Movie.findByPk(movieId);

            movie.title = title?.trim() || movie.title;
            movie.rating = rating || movie.rating;
            movie.awards = awards || movie.awards;
            movie.release_date = release_date || movie.release_date;
            movie.length = length || movie.length;
            movie.genre_id = genre_id || movie.genre_id;
            
            await movie.save();

            return res.status(200).json({
                    ok: true,
                    meta: {
                        status: 200
                    },
                    data: {
                        movie
                    }
                });
        }
        catch(error) {
            console.log(error);

            return res.status(error.status || 500).json({
                    ok: false,
                    msg: error.message
                });
        }
    },
    destroy: async (req,res) => {

        try {

            let movieId = req.params.id;

            const deletedMovie = await db.Movie.findByPk(movieId);
            
            await db.Actor.update({
                    favorite_movie_id: null
                },
                {
                    where: { 
                        favorite_movie_id: movieId 
                    }
                });

            await db.ActorMovie.destroy({
                where: {
                    movie_id : movieId 
                }
            });

            await db.Movie.destroy({
                where: {
                    id: movieId
                }, 
                force: true
            }); // force: true es para asegurarse de que se elimine el registro, aunque tenga FKs.

            return res.status(200).json({
                    ok: true,
                    meta: {
                        status: 200
                    },
                    data: {
                        deletedMovie
                    },
                    msg: 'La película fue eliminada con éxito.'
                });
        } 
        catch (error) {
            console.log(error);
            return res.status(error.status || 500).json({
                    ok: false,
                    status: error.status || 500,
                    msg: error.message  || 'Ups... Algo salió mal :c'
                });
        }
    }
}

module.exports = moviesController;