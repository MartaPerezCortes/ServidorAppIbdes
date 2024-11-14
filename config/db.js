const {Pool}=require('pg');

const pool =new Pool({
    user:'postgres',
    host:'ibdes.c0slroodj8gg.us-east-1.rds.amazonaws.com',
    database: 'postgres',
    password:'Sanvalero2024',
    port:5432,
    ssl: {
        require:true,
        rejectUnauthorized:false,
    
    }
});

module.exports=pool;