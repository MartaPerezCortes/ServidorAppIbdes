require('dotenv').config();

const express=require('express');
const cors=require('cors');
const pool=require('./config/db');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');

const app=express();
const PORT=3000;

app.use(cors());
app.use(express.json());
app.use(bodyParser.json());

// Configura el transporte SMTP con Nodemailer
const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com", // Servidor SMTP
    port: 465,
    secure: true, // true para 465, false para otros puertos
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    }
});

app.get('/', (req, res) =>{
    res.send('Servidor funcionando');
});

// Inicia el servidor
app.listen(PORT, () => {
console.log(`Servidor escuchando en http://localhost:${PORT}`);
});

app.get('/usuarios', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM USUARIO;');
    res.json(result.rows); // Enviar los resultados al cliente en formato JSON
  } catch (error) {
    console.error('Error al obtener usuarios:', error);
    res.status(500).json({ error: 'Error al obtener usuarios' });
  }
});

/*LOGIN*/

app.get('/login', async (req,res)=>{
    const {EMAIL, PASSWORD}= req.query;

    try{

        if(!EMAIL||!PASSWORD){
            return res.status(400).send('Complete email y password');
        }
        const result= await pool.query('SELECT * FROM usuario WHERE correo_usuario=$1 AND contrasena_usuario=$2', [EMAIL, PASSWORD]);

        if(result.rows.length>0){
            res.json(result.rows[0]);
        }else{
            res.status(401).send('Usuario no encontrado')
        }
    }catch (err){
        console.error(err);
        res.status(500).send('Error en servidor');
    }
});

/*REGISTRO*/

app.post('/registro', async (req, res) => {
  console.log('Solicitud de registro recibida');
  // Imprimir el cuerpo de la solicitud
  console.log('Cuerpo de la solicitud:', req.body);
  
  const { nombre_usuario, correo_usuario, contrasena_usuario } = req.body;
  const id_Rol = 1; // Siempre asignar el rol como 1 (usuario normal)

  // Verificar que todos los campos obligatorios estén completos
  if (!nombre_usuario || !correo_usuario || !contrasena_usuario) {
    return res.status(400).json({ error: 'Por favor, completa todos los campos' });
  }

  try {
    // Verificar si el correo ya está en uso
    const existingUser = await pool.query('SELECT * FROM usuario WHERE correo_usuario = $1', [correo_usuario]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'El correo ya está registrado' });
    }

    // Insertar el nuevo usuario en la base de datos
    const result = await pool.query(
      'INSERT INTO usuario (nombre_usuario, correo_usuario, contrasena_usuario, id_rol) VALUES ($1, $2, $3, $4) RETURNING id_Usuario',
      [nombre_usuario, correo_usuario, contrasena_usuario, id_Rol]
    );

    console.log('Usuario registrado con éxito:', result.rows[0]);

    res.status(201).json({ message: 'Usuario registrado exitosamente', userId: result.rows[0].id_usuario });
  } catch (error) {
    console.error('Error al registrar usuario:', error);
    res.status(500).json({ error: 'Error al registrar usuario' });
  }
});




/*LISTAR ACTIVIDADES*/
app.get('/api/actividades', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT a.id_Actividad, 
                   a.nombre_Actividad, 
                   a.descripcion_Actividad, 
                   a.lugar_Actividad, 
                   a.precio_Actividad, 
                   a.imagen_Actividad, 
                   a.dia_Actividad, 
                   a.fechaInicio, 
                   a.fechaFin, 
                   a.horaInicio, 
                   a.horaFin, 
                   a.plazas_Dia_Horario,
                   (a.plazas_Dia_Horario - COALESCE(SUM(i.cantidad), 0))::int AS plazas_libres, 
                   c.nombre_Categoria
            FROM ACTIVIDAD a
            LEFT JOIN INSCRIBIR i ON a.id_Actividad = i.id_Actividad
            JOIN ACTIVIDAD_CATEGORIA ac ON a.id_Actividad = ac.id_Actividad
            JOIN CATEGORIA c ON ac.id_Categoria = c.id_Categoria
            GROUP BY a.id_Actividad, c.nombre_Categoria
            ORDER BY a.id_Actividad;
        `);
        res.status(200).json(result.rows);
    } catch (error) {
        console.error('Error al obtener las actividades:', error);
        res.status(500).json({ error: 'Error al obtener las actividades' });
    }
  });
  

  /* LISTAR POR CTAEGORIA*/

  
// Listar actividades por categoría
app.get('/api/categoria/:idCategoria', async (req, res) => {
    const { idCategoria } = req.params;
    try {
        const result = await pool.query(`
            SELECT a.id_Actividad, 
                   a.nombre_Actividad, 
                   a.descripcion_Actividad, 
                   a.lugar_Actividad, 
                   a.precio_Actividad, 
                   a.imagen_Actividad, 
                   a.dia_Actividad, 
                   a.fechaInicio, 
                   a.fechaFin, 
                   a.horaInicio, 
                   a.horaFin, 
                   a.plazas_Dia_Horario,
                   (a.plazas_Dia_Horario - COALESCE(SUM(i.cantidad), 0))::int AS plazas_libres, 
                   c.nombre_Categoria
            FROM ACTIVIDAD a
            LEFT JOIN INSCRIBIR i ON a.id_Actividad = i.id_Actividad
            JOIN ACTIVIDAD_CATEGORIA ac ON a.id_Actividad = ac.id_Actividad
            JOIN CATEGORIA c ON ac.id_Categoria = c.id_Categoria
            WHERE c.id_Categoria = $1
            GROUP BY a.id_Actividad, c.nombre_Categoria
            ORDER BY a.id_Actividad;
        `, [idCategoria]);
        res.status(200).json(result.rows);
    } catch (error) {
        console.error('Error al obtener las actividades por categoría:', error);
        res.status(500).json({ error: 'Error al obtener las actividades por categoría' });
    }
});

/*TOP ACTIVIDADES*/


app.get('/top', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT a.id_Actividad, 
                   a.nombre_Actividad, 
                   a.descripcion_Actividad, 
                   a.lugar_Actividad, 
                   a.precio_Actividad, 
                   a.imagen_Actividad, 
                   a.dia_Actividad, 
                   a.fechaInicio, 
                   a.fechaFin, 
                   a.horaInicio, 
                   a.horaFin, 
                   a.plazas_Dia_Horario,
                   (a.plazas_Dia_Horario - COALESCE(SUM(i.cantidad), 0))::int AS plazas_libres, 
                   c.nombre_Categoria,
                   COALESCE(SUM(i.cantidad), 0) AS total_inscripciones
            FROM ACTIVIDAD a
            LEFT JOIN INSCRIBIR i ON a.id_Actividad = i.id_Actividad
            JOIN ACTIVIDAD_CATEGORIA ac ON a.id_Actividad = ac.id_Actividad
            JOIN CATEGORIA c ON ac.id_Categoria = c.id_Categoria
            GROUP BY a.id_Actividad, c.nombre_Categoria
            ORDER BY total_inscripciones DESC
            LIMIT 5;  
        `);
        res.status(200).json(result.rows);
    } catch (error) {
        console.error('Error al obtener las actividades más inscriptas:', error);
        res.status(500).json({ error: 'Error al obtener las actividades más inscriptas' });
    }
});

/*INSCRIPCIONES Y CREACION DE PEDIDOS*/
// Ruta para inscribirse en una actividad
app.post('/api/inscripcion', async (req, res) => {
  const { id_actividad, id_usuario, nombre_inscripcion, telefono_inscripcion, correo_inscripcion, cantidad } = req.body;

  // Imprimir el cuerpo de la solicitud para verificar los datos recibidos
  console.log('Datos de la inscripción recibidos:', req.body);

  try {
      // Verificar que la cantidad sea mayor a 0
      if (cantidad <= 0) {
          return res.status(400).json({ error: 'La cantidad debe ser mayor a 0' });
      }

      // Obtener el precio de la actividad (opcional, pero puede ser útil)
      const actividadResult = await pool.query(`
          SELECT precio_Actividad FROM ACTIVIDAD WHERE id_Actividad = $1;
      `, [id_actividad]);

      if (actividadResult.rows.length === 0) {
          return res.status(404).json({ error: 'Actividad no encontrada' });
      }

      // Crear o obtener un pedido existente
      const id_pedido = await getOrCreatePedido(id_usuario); // Función que recupera o crea un pedido

      console.log('ID del pedido obtenido:', id_pedido); // Verificar el id_Pedido

      // Asegúrate de que el id_Pedido no sea null
      if (!id_pedido) {
          return res.status(500).json({ error: 'No se pudo obtener el ID del pedido' });
      }

      // Insertar la inscripción en la tabla INSCRIBIR
      await pool.query(`
          INSERT INTO INSCRIBIR (id_Pedido, id_Actividad, nombre_Inscripcion, telefono_Inscripcion, correo_Inscripcion, cantidad)
          VALUES ($1, $2, $3, $4, $5, $6);
      `, [id_pedido, id_actividad, nombre_inscripcion, telefono_inscripcion, correo_inscripcion, cantidad]);

      res.status(201).json({ message: 'Inscripción realizada con éxito' });
  } catch (error) {
      console.error('Error al inscribir:', error);
      res.status(500).json({ error: 'Error al inscribir en la actividad' });
  }
});


// Función para obtener o crear un pedido
async function getOrCreatePedido(id_usuario) {
  // Aquí puedes buscar un pedido existente en la tabla PEDIDO
  const result = await pool.query(`
      SELECT id_Pedido FROM PEDIDO WHERE id_Usuario = $1 AND estado_Pedido = 'Pendiente'
  `, [id_usuario]);

  if (result.rows.length > 0) {
      console.log('Pedido existente encontrado:', result.rows[0].id_pedido);
      return result.rows[0].id_pedido;
  } else {
      try {
          const newPedidoResult = await pool.query(`
              INSERT INTO PEDIDO (id_Usuario, fecha_Pedido, estado_Pedido, precio_Pedido)
              VALUES ($1, CURRENT_DATE, 'Pendiente', 0) RETURNING id_Pedido;
          `, [id_usuario]);
          
          console.log('Nuevo pedido creado con ID:', newPedidoResult.rows[0].id_pedido);
          return newPedidoResult.rows[0].id_pedido;
      } catch (insertError) {
          console.error('Error al crear el pedido:', insertError);
          throw insertError; // Re-lanza el error para manejarlo más arriba
      }
  }
}


/*CARRITO: Inscripciones pendientes*/
app.get('/carrito/:userId', async (req, res) => {
    const userId = req.params.userId;
    
    try {
        const result = await pool.query(`
            SELECT 
                a.nombre_actividad, 
                a.imagen_actividad, 
                a.fechainicio, 
                a.precio_actividad, 
                i.cantidad,
                (a.precio_actividad * i.cantidad) AS precio_total 
            FROM INSCRIBIR i 
            JOIN PEDIDO p ON i.id_pedido = p.id_pedido 
            JOIN ACTIVIDAD a ON i.id_actividad = a.id_actividad 
            WHERE p.id_usuario = $1 AND p.estado_pedido = 'Pendiente'
        `, [userId]);

        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al obtener inscripciones' });
    }
});
/*RESERVAS: inscripciones completas*/
app.get('/reservas/:userId', async (req, res) => {
    const userId = req.params.userId;

    try {
        const result = await pool.query(`
            SELECT 
                a.nombre_actividad, 
                a.imagen_actividad, 
                a.fechainicio, 
                a.precio_actividad, 
                i.cantidad,
                (a.precio_actividad * i.cantidad) AS precio_total 
            FROM INSCRIBIR i 
            JOIN PEDIDO p ON i.id_pedido = p.id_pedido 
            JOIN ACTIVIDAD a ON i.id_actividad = a.id_actividad 
            WHERE p.id_usuario = $1 
              AND p.estado_pedido = 'Completado' 
              AND a.fechainicio >= NOW()  
        `, [userId]);

        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al obtener reservas' });
    }
});



/*NOTIFICACION*/
const WebSocket = require('ws'); // WebSocket para notificaciones en tiempo real

// Configura el servidor WebSocket en el puerto 8080
const wss = new WebSocket.Server({ port: 8080 });
let clients = []; // Guardar clientes conectados

// Cuando un cliente se conecta
wss.on('connection', (ws) => {
    console.log('Cliente conectado');
    clients.push(ws); // Guardar al cliente

    // Manejar desconexión
    ws.on('close', () => {
        console.log('Cliente desconectado');
        clients = clients.filter(client => client !== ws);
    });
});

// Función para enviar notificación a los clientes conectados
function notifyClients(message) {
    console.log("Intentando enviar notificación a clientes:", message); 
    clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(message));
        }
        console.log("Notificación enviada a los clientes:", message);
    });
}


/*REALIZAR COMPRA*/

app.post('/comprar/:idUsuario', async (req, res) => {
    const { idUsuario } = req.params;

    try {
        // Actualizar el pedido a completado
        const updateResult = await pool.query(`
            UPDATE PEDIDO
            SET estado_Pedido = 'Completado'
            WHERE id_Usuario = $1 AND estado_Pedido = 'Pendiente'
            RETURNING id_Pedido;
        `, [idUsuario]);

        // Obtener el ID del pedido recientemente completado
        const id_pedido = updateResult.rows[0].id_pedido;

        // Verificar si se obtuvo un pedido
        if (!id_pedido) {
            return res.status(400).json({ error: 'No se pudo completar el pedido.' });
        }

        // Obtener el correo del usuario
        const userResult = await pool.query(`SELECT correo_usuario FROM USUARIO WHERE id_usuario = $1`, [idUsuario]);
        const destinatario = userResult.rows[0].correo_usuario;

        // Obtener detalles de las actividades del último pedido completado
        const detallesPedido = await pool.query(`
            SELECT a.nombre_actividad, a.dia_actividad, a.precio_actividad, i.cantidad,
                   (a.precio_actividad * i.cantidad) AS subtotal
            FROM INSCRIBIR i
            JOIN ACTIVIDAD a ON i.id_actividad = a.id_actividad
            WHERE i.id_pedido = $1;
        `, [id_pedido]);

        // Construir el mensaje con detalles del pedido y calcular el total correctamente
        let mensaje = 'Gracias por su compra. Aquí están los detalles de su pedido:\n\n';
        let totalCompra = 0;

        detallesPedido.rows.forEach(item => {
            const subtotal = Number(item.subtotal) || 0; // Asegurarse de que subtotal es un número
            mensaje += `Actividad: ${item.nombre_actividad}\n`;
            mensaje += `Día: ${item.dia_actividad}\n`;
            mensaje += `Precio: €${item.precio_actividad}\n`;
            mensaje += `Cantidad: ${item.cantidad}\n`;
            mensaje += `Subtotal: €${subtotal.toFixed(2)}\n\n`;
            totalCompra += subtotal;
        });

        mensaje += `Total de la compra: €${totalCompra.toFixed(2)}\n`;
        mensaje += 'Gracias por su confianza. ¡Esperamos que disfrute de las actividades!';

        // Configuración del correo
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: destinatario,
            subject: 'Confirmación de Compra',
            text: mensaje,
        };

        // Enviar el correo
        await transporter.sendMail(mailOptions);

        console.log("Clientes conectados:", clients.length);

        // Enviar notificación a los clientes conectados
        notifyClients({ title: 'Compra Realizada', body: 'Gracias por su compra. Su pedido ha sido completado exitosamente.' });

        // Responder al cliente
        res.status(200).json({ message: 'Pedido completado, correo y notificación enviados con éxito' });
    } catch (error) {
        console.error('Error al completar el pedido:', error);
        res.status(500).json({ error: 'Error al completar el pedido' });
    }
});

/*AÑADIR ACTIVIDAD*/

app.post('/crearactividad', async (req, res) => {
    const {
        nombre_actividad,
        descripcion_actividad,
        lugar_actividad,
        precio_actividad,
        imagen_actividad,
        dia_actividad,
        fechainicio,
        fechafin,
        horainicio,
        horafin,
        plazas_dia_horario,
        categorias  // Array de IDs de categorías
    } = req.body;

    try {
        // Iniciar transacción
        await pool.query('BEGIN');

        // Insertar en ACTIVIDAD
        const insertActividadResult = await pool.query(`
            INSERT INTO ACTIVIDAD 
            (nombre_Actividad, descripcion_Actividad, lugar_Actividad, precio_Actividad, 
             imagen_Actividad, dia_Actividad, fechaInicio, fechaFin, horaInicio, horaFin, plazas_Dia_Horario)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) 
            RETURNING id_Actividad
        `, [
            nombre_actividad, descripcion_actividad, lugar_actividad, precio_actividad,
            imagen_actividad, dia_actividad, fechainicio, fechafin, horainicio, horafin, plazas_dia_horario
        ]);

        const actividadId = insertActividadResult.rows[0].id_actividad;

        // Insertar en ACTIVIDAD_CATEGORIA para cada categoría seleccionada
        for (const categoriaId of categorias) {
            await pool.query(`
                INSERT INTO ACTIVIDAD_CATEGORIA (id_Actividad, id_Categoria) 
                VALUES ($1, $2)
            `, [actividadId, categoriaId]);
        }

        // Confirmar la transacción
        await pool.query('COMMIT');
        res.status(201).json({ message: 'Actividad creada con éxito', actividadId });

    } catch (error) {
        await pool.query('ROLLBACK');
        console.error('Error al crear la actividad:', error);
        res.status(500).json({ error: 'Error al crear la actividad' });
    }
});


/*app.post('/comprar/:idUsuario', async (req, res) => {
    const { idUsuario } = req.params;
  
    try {
        // Actualizar el pedido a completado
        const updateResult = await pool.query(`
            UPDATE PEDIDO
            SET estado_Pedido = 'Completado'
            WHERE id_Usuario = $1 AND estado_Pedido = 'Pendiente'
            RETURNING id_Pedido;
        `, [idUsuario]);
  
        // Obtener el ID del pedido recientemente completado
        const id_pedido = updateResult.rows[0].id_pedido;
  
        // Verificar si se obtuvo un pedido
        if (!id_pedido) {
            return res.status(400).json({ error: 'No se pudo completar el pedido.' });
        }
  
        // Obtener el correo del usuario
        const userResult = await pool.query(`SELECT correo_usuario FROM USUARIO WHERE id_usuario = $1`, [idUsuario]);
        const destinatario = userResult.rows[0].correo_usuario;
  
        // Obtener detalles de las actividades del último pedido completado
        const detallesPedido = await pool.query(`
            SELECT a.nombre_actividad, a.dia_actividad, a.precio_actividad, i.cantidad,
                   (a.precio_actividad * i.cantidad) AS subtotal
            FROM INSCRIBIR i
            JOIN ACTIVIDAD a ON i.id_actividad = a.id_actividad
            WHERE i.id_pedido = $1;
        `, [id_pedido]);
  
        // Construir el mensaje con detalles del pedido y calcular el total correctamente
        let mensaje = 'Gracias por su compra. Aquí están los detalles de su pedido:\n\n';
        let totalCompra = 0;
  
        detallesPedido.rows.forEach(item => {
            const subtotal = Number(item.subtotal) || 0; // Asegurarse de que subtotal es un número
            mensaje += `Actividad: ${item.nombre_actividad}\n`;
            mensaje += `Día: ${item.dia_actividad}\n`;
            mensaje += `Precio: €${item.precio_actividad}\n`;
            mensaje += `Cantidad: ${item.cantidad}\n`;
            mensaje += `Subtotal: €${subtotal.toFixed(2)}\n\n`;
            totalCompra += subtotal;
        });
  
        mensaje += `Total de la compra: €${totalCompra.toFixed(2)}\n`;
        mensaje += 'Gracias por su confianza. ¡Esperamos que disfrute de las actividades!';
  
        // Configuración del correo
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: destinatario,
            subject: 'Confirmación de Compra',
            text: mensaje,
        };
  
        // Enviar el correo
        await transporter.sendMail(mailOptions);
  
        // Responder al cliente
        res.status(200).json({ message: 'Pedido completado y correo enviado con éxito' });
    } catch (error) {
        console.error('Error al completar el pedido:', error);
        res.status(500).json({ error: 'Error al completar el pedido' });
    }
  });*/
  
 
