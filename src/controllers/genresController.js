const db = require('../database/models');
const { createError }= require('../helpers');
const { Op } = require('sequelize');
const sequelize = db.sequelize;

module.exports = {
    
    list: async (req, res) => {

        let { limit, order } = req.query; 
        const fields = ['name', 'ranking', 'id'];

        try {

            if(order && !fields.includes(order)){ 
            throw createError(400, `Solo se puede ordernar por los campos ${fields.join(', ')}`);
            }
            let total = await db.Genre.count();
            let genres = await db.Genre.findAll({

                    attributes:{   
                        exclude : ['created_at', 'updated_at']
                    },
                    limit: limit ? +limit : 5,
                    order: [ order ? order : 'id']
                });

            return res.status(200).json({
                    ok: true,
                    meta: {
                        status: 200
                    },
                    data: {
                        perPage: genres.length,
                        total,
                        genres
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
    getById: async (req, res) => 
    {
        const { id } = req.params;

        try {

            if(isNaN(id)){
            throw createError(400, 'El ID debe ser un número entero positivo.');
            }
            const genre = await db.Genre.findByPk(req.params.id);
            
            if(!genre){
            throw createError(404, 'No se encuentra un género con esa ID.');
            }

            return res.status(200).json({
                    ok: true,
                    meta: {
                        status: 200,
                    },
                    data: {
                        genre,
                        total: 1
                    }
                });
        }
        catch(error){
            console.log(error);
            return res.status(error.status || 500).json({
                    ok: false,
                    msg: error.message,
                });
        }
    },
    getByName: async(req, res) =>{

        const {name} = req.params;

        try {

            if(!name){
            throw createError(400, 'Debe introducir un nombre a buscar.')
            }

            const genre = await db.Genre.findOne({

                    where:{
                        name:{
                            [Op.substring]: name
                        }
                    }
                });

            if(!genre){
            throw createError(404, 'No se encuentra un género con ese nombre.')
            }

            return res.status(200).json({
                    ok: true,
                    meta: {
                        status: 200,
                    },
                    data: {
                        genre,
                        total: 1
                    }
                });
        }
        catch (error){
            console.log(error);
            return res.status(error.status || 500).json({
                    ok: false,
                    msg: error.message,
                });
        }
    }

}