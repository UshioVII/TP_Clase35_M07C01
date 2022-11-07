const path = require('path');
const db = require('../database/models');
const sequelize = db.sequelize;
const { Op } = require("sequelize");
const moment = require('moment');
const { createError } = require ('../helpers');
const { getUrl } = require('../helpers');  

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
                    meta:{
                        status: 200
                    },
                    data:{
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
    getById: (req, res) => {
        db.Movie.findByPk(req.params.id,
            {
                include : ['genre']
            })
            .then(movie => {
                res.render('moviesDetail.ejs', {movie});
            });
    },
    newest: (req, res) => {
        db.Movie.findAll({
            order : [
                ['release_date', 'DESC']
            ],
            limit: 5
        })
            .then(movies => {
                res.render('newestMovies', {movies});
            });
    },
    recommended: (req, res) => {
        db.Movie.findAll({
            include: ['genre'],
            where: {
                rating: {[db.Sequelize.Op.gte] : 8}
            },
            order: [
                ['rating', 'DESC']
            ]
        })
            .then(movies => {
                res.render('recommendedMovies.ejs', {movies});
            });
    },
    create: function (req,res) {
        Movies
        .create(
            {
                title: req.body.title,
                rating: req.body.rating,
                awards: req.body.awards,
                release_date: req.body.release_date,
                length: req.body.length,
                genre_id: req.body.genre_id
            }
        )
        .then(()=> {
            return res.redirect('/movies')})            
        .catch(error => res.send(error))
    },
    edit: function(req,res) {
        let movieId = req.params.id;
        let promMovies = Movies.findByPk(movieId,{include: ['genre','actors']});
        let promGenres = Genres.findAll();
        let promActors = Actors.findAll();
        Promise
        .all([promMovies, promGenres, promActors])
        .then(([Movie, allGenres, allActors]) => {
            Movie.release_date = moment(Movie.release_date).format('L');
            return res.render(path.resolve(__dirname, '..', 'views',  'moviesEdit'), {Movie,allGenres,allActors})})
        .catch(error => res.send(error))
    },
    update: function (req,res) {
        let movieId = req.params.id;
        Movies
        .update(
            {
                title: req.body.title,
                rating: req.body.rating,
                awards: req.body.awards,
                release_date: req.body.release_date,
                length: req.body.length,
                genre_id: req.body.genre_id
            },
            {
                where: {id: movieId}
            })
        .then(()=> {
            return res.redirect('/movies')})            
        .catch(error => res.send(error))
    },
    destroy: function (req,res) {
        let movieId = req.params.id;
        Movies
        .destroy({where: {id: movieId}, force: true}) // force: true es para asegurar que se ejecute la acción
        .then(()=>{
            return res.redirect('/movies')})
        .catch(error => res.send(error)) 
    }
}

module.exports = moviesController;