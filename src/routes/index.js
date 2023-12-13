const axios = require('axios');
const express = require('express');
const router = express.Router();
const https = require('https');

/**
 * @openapi
 * /micuenta:
 *   get:
 *     summary: Obtener información de la cuenta utilizando la API key
 *     tags:
 *       - Micuenta
 *     description: Obtener información de la cuenta utilizando la API key
 *     parameters:
 *       - in: query
 *         name: apikey
 *         required: true
 *         description: La API key asociada con la cuenta.
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Respuesta exitosa
 *         content:
 *           application/json:
 *             example:
 *               creditos: 100
 *               vencimiento_plan: "2023-12-31T23:59:59.999Z"
 *               api_key: "tu-api-key"
 *               user_name: "nombre_de_usuario"
 *       400:
 *         description: Parámetros de solicitud inválidos
 *         content:
 *           application/json:
 *             example:
 *               message: "Parámetros de solicitud inválidos"
 *       401:
 *         description: No autorizado - La API key es incorrecta
 *         content:
 *           application/json:
 *             example:
 *               message: "Apikey errónea"
 *       403:
 *         description: Prohibido - La cuenta está vencida
 *         content:
 *           application/json:
 *             example:
 *               message: "La cuenta está vencida"
 *       404:
 *         description: Usuario no encontrado
 *         content:
 *           application/json:
 *             example:
 *               message: "Usuario no encontrado"
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             example:
 *               message: "Error al obtener datos"
 */


router.get("/micuenta", async (req, res) => {

  const { apikey } = req.body;

  try {
    // Primera solicitud con axios
    const response = await axios.get(`${process.env.NEXT_PUBLIC_STRAPI_API_URL}/auth0users?populate=*`, {
      params: {
        "filters[apikey][$eq]": apikey,
      },
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.NEXT_PUBLIC_STRAPI_API_KEY}`,
      },
    });

    if (response.status !== 200) {
      throw new Error(`Failed to fetch data, ${response.status}`);
    }

    const usuario = response.data;

    if (usuario.data.length < 1) {
      res.send("Usuario no encontrado");
      return;
    }

    const email = usuario.data[0]?.attributes?.email;
    const userapikeystrapi = usuario.data[0].attributes.apikey;
    const vencimientoPlan = new Date(usuario.data[0].attributes.vencimiento);

    // Validar si la cuenta está vencida
    const currentDate = new Date();
    if (vencimientoPlan < currentDate) {
      res.json({ message: "La cuenta está vencida" });
      return;
    }

    // Validar si la apikey es la correcta
    if (userapikeystrapi == apikey) {
      const micuenta = {
        "creditos": usuario.data[0].attributes.creditos,
        "vencimiento_plan": vencimientoPlan,
        "api_key": usuario.data[0].attributes.apikey,
        "user_name": usuario.data[0].attributes.username
      }
      res.json(micuenta);
    } else {
      res.json({ message: "Apikey erronea" });
    }

  } catch (error) {
    res.status(500).json({ error: `Failed to fetch data, ${error.message}` });
  }

});

/**
 * @openapi
 * /busqueda:
 *   get:
 *     summary: Realizar una búsqueda
 *     tags:
 *       - Búsqueda
 *     description: |
 *       Inicia una búsqueda basada en la API key, sujetos y fuente proporcionados.
 *       Valida la cuenta, sujetos, fuente y créditos disponibles antes de proceder con la búsqueda.
 *     parameters:
 *       - in: query
 *         name: apikey
 *         required: true
 *         description: La API key asociada con la cuenta.
 *         schema:
 *           type: string
 *       - in: query
 *         name: sujetos
 *         required: true
 *         description: Un array de sujetos a buscar.
 *         schema:
 *           type: array
 *           items:
 *             type: string
 *       - in: query
 *         name: fuente
 *         required: true
 *         description: La fuente para la búsqueda (puede ser "noticias", "judicial" , "accionistas", "titulos").
 *         schema:
 *           type: string
 *           enum: ["noticias", "judicial" , "accionistas", "titulos"]
 *     responses:
 *       200:
 *         description: Respuesta exitosa
 *         content:
 *           application/json:
 *             example:
 *               id_busqueda: "12345"
 *               creditos_consumidos: 10
 *               creditos_restantes: 90
 *       400:
 *         description: Parámetros de solicitud inválidos
 *         content:
 *           application/json:
 *             example:
 *               message: "Parámetros de solicitud inválidos"
 *       401:
 *         description: No autorizado - La API key es incorrecta
 *         content:
 *           application/json:
 *             example:
 *               message: "Apikey incorrecta"
 *       403:
 *         description: Prohibido - La cuenta está vencida o los créditos son insuficientes
 *         content:
 *           application/json:
 *             examples:
 *               - message: "La cuenta está vencida"
 *               - message: "Créditos insuficientes"
 *       404:
 *         description: Usuario no encontrado
 *         content:
 *           application/json:
 *             example:
 *               message: "Usuario no encontrado"
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             example:
 *               message: "Error interno del servidor"
 */


router.get("/busqueda", async (req, res) => {
  const { apikey, sujetos, fuente } = req.body;

  try {
    // Primera solicitud con axios
    const response = await axios.get(`${process.env.NEXT_PUBLIC_STRAPI_API_URL}/auth0users?populate=*&`, {
      params: {
        "filters[apikey][$eq]": apikey,
      },
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.NEXT_PUBLIC_STRAPI_API_KEY}`,
      },
    });

    if (response.status !== 200) {
      throw new Error(`Failed to fetch data, ${response.status}`);
    }

    const usuario = response.data;

    if (usuario.data.length < 1) {
      res.send("Usuario no encontrado");
      return;
    }
    const email = usuario.data[0]?.attributes?.email;
    const userapikeystrapi = usuario.data[0]?.attributes?.apikey;
    const vencimientoPlan = new Date(usuario.data[0]?.attributes?.vencimiento);
    const creditosusuario = usuario.data[0].attributes.creditos
    const usuarioid = usuario.data[0].id
    const usuarioplanid = usuario.data[0].attributes.plan?.data.id

    // Validar si la cuenta está vencida
    const currentDate = new Date();
    if (vencimientoPlan < currentDate) {
      res.send("La cuenta está vencida");
      return;
    }

    // Validar que sujetos sea un array de strings
    if (!Array.isArray(sujetos)) {
      res.send("Sujetos debe ser un array de strings");
      return;
    }

    // Validar si la apikey es la correcta
    if (userapikeystrapi === apikey) {
      try {
        // Llamada adicional después de la validación del email y key
        const creditosFuentesResponse = await axios.get(`${process.env.NEXT_PUBLIC_STRAPI_API_URL}/creditos-fuentes`, {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_STRAPI_API_KEY}`,
          },
        });

        if (creditosFuentesResponse.status !== 200) {
          throw new Error(`Failed to fetch creditos-fuentes data, ${creditosFuentesResponse.status}`);
        }

        const creditosFuentesData = creditosFuentesResponse.data.data;

        const fuenteseleccionada = await creditosFuentesData.find(
          (fuenteObj) => fuenteObj.attributes.fuente === fuente
        );

        if (!fuenteseleccionada) {
          res.send("Fuente inválida")
          return
        }

        const creditosconsumidos = fuenteseleccionada.attributes.credito * sujetos.length
        const creditosrestantes = creditosusuario - creditosconsumidos

        if (creditosrestantes < 0) {
          res.send("Créditos insuficientes")
          return
        }

        console.log('Respuesta de las fuentes:', fuenteseleccionada);

        const data = JSON.stringify({
          "list": sujetos,
          "item_type": "cedulas",
          "source": fuente,
          "key": process.env.NEXT_PUBLIC_ADVANTECH_PRIVATE_KEY
        });

        const config = {
          method: 'post',
          url: `${process.env.NEXT_PUBLIC_ADVANTECH_PRIVATE_URL}/data/create_search`,
          headers: {
            'Content-Type': 'application/json'
          },
          data: data,
          httpsAgent: new https.Agent({ rejectUnauthorized: false }),
        };

        const response2 = await axios(config);

        // Manejar la respuesta de la segunda solicitud aquí
        console.log('Respuesta de la segunda solicitud:', response2.data);

        const respuestacompleta = {
          "id_busqueda": response2.data.query_id,
          "creditos_consumidos": creditosconsumidos,
          "creditos_restantes": creditosrestantes
        }

        res.send(respuestacompleta);

        // Realizar la solicitud PUT para restar los créditos
        const putResponse = await axios.put(
          `${process.env.NEXT_PUBLIC_STRAPI_API_URL}/auth0users/${usuarioid}`,
          {
            data: {
              creditos: creditosrestantes,
            },
          },
          {
            headers: {
              "Content-Type": "application/json",
            },
          }
        );


        // Realizar la solicitud POST para almacenar en historials

        const posthistorialData = {
          auth_0_user: usuarioid,
          creditos: creditosconsumidos * -1,
          fecha: currentDate,
          precio: 0,
          consulta: "Búsqueda por lote " + fuente,
          plane: usuarioplanid,
          puntero: {},
          status: "IN PROGRESS",
          query_id: response2.data.query_id,
          busqueda: JSON.stringify({
            consulta: "Búsqueda por lote",
            fuente: fuente,
          }),
        };

        const posthistorialResponse = await axios.post(
          `${process.env.NEXT_PUBLIC_STRAPI_API_URL}/historials`,
          { data: posthistorialData },
          {
            headers: {
              "Content-Type": "application/json",
            },
          }
        );

      } catch (error) {
        console.error('Error en la segunda solicitud con axios:', error);
        res.status(500).send('Error interno del servidor en la segunda solicitud con axios');
      }
    } else {
      res.send("Apikey incorrecta");
    }
  } catch (error) {
    console.error('Error en la primera solicitud con axios:', error);
    res.status(500).send('Error interno del servidor en la primera solicitud con axios');
  }
});

/**
 * @openapi
 * /datos:
 *   get:
 *     summary: Obtener datos para una búsqueda específica
 *     tags:
 *       - Datos
 *     description: |
 *       Recupera datos para una búsqueda específica basada en la API key y el ID de búsqueda proporcionados.
 *       Valida la cuenta, el ID de búsqueda y la API key antes de proceder con la recuperación de datos.
 *     parameters:
 *       - in: query
 *         name: apikey
 *         required: true
 *         description: La API key asociada con la cuenta.
 *         schema:
 *           type: string
 *       - in: query
 *         name: id_busqueda
 *         required: true
 *         description: El ID de la búsqueda para la cual se solicitan datos.
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Respuesta exitosa
 *         content:
 *           application/json:
 *             example:
 *               data: { /* Tu estructura de datos aquí * / }
 *       400:
 *         description: Parámetros de solicitud inválidos
 *         content:
 *           application/json:
 *             example:
 *               messages:
 *                 - "Parámetros de solicitud inválidos"
 *       401:
 *         description: No autorizado - La API key es incorrecta
 *         content:
 *           application/json:
 *             example:
 *               messages:
 *                 - "Apikey incorrecta"
 *       403:
 *         description: Prohibido - La cuenta está vencida
 *         content:
 *           application/json:
 *             example:
 *               messages:
 *                 - "La cuenta está vencida"
 *       404:
 *         description: Usuario no encontrado o búsqueda no encontrada
 *         content:
 *           application/json:
 *             example:
 *               messages:
 *                 - "Usuario no encontrado"
 *                 - "Búsqueda no encontrada"
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             example:
 *               messages:
 *                 - "Error interno del servidor"
 */


router.get("/datos", async (req, res) => {
  const { apikey, id_busqueda } = req.body;

  try {
    // Primera solicitud con axios
    const response = await axios.get(`${process.env.NEXT_PUBLIC_STRAPI_API_URL}/auth0users?populate=*&`, {
      params: {
        "filters[apikey][$eq]": apikey,
      },
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.NEXT_PUBLIC_STRAPI_API_KEY}`,
      },
    });

    if (response.status !== 200) {
      throw new Error(`Failed to fetch data, ${response.status}`);
    }

    const usuario = response.data;

    if (usuario.data.length < 1) {
      res.send("Usuario no encontrado");
      return;
    }
    const email = usuario.data[0]?.attributes?.email;
    const userapikeystrapi = usuario.data[0]?.attributes?.apikey;
    const vencimientoPlan = new Date(usuario.data[0]?.attributes?.vencimiento);

    // Validar si la cuenta está vencida
    const currentDate = new Date();
    if (vencimientoPlan < currentDate) {
      res.send("La cuenta está vencida");
      return;
    }

    // Validar si la apikey es la correcta
    if (userapikeystrapi === apikey) {
      try {
        const data = JSON.stringify({
          "query_id": id_busqueda,
          "key": process.env.NEXT_PUBLIC_ADVANTECH_PRIVATE_KEY
        });

        const config = {
          method: 'post',
          url: `${process.env.NEXT_PUBLIC_ADVANTECH_PRIVATE_URL}/data/status`,
          headers: {
            'Content-Type': 'application/json'
          },
          data: data,
          httpsAgent: new https.Agent({ rejectUnauthorized: false }),
        };

        const response2 = await axios(config);

        // Manejar la respuesta de la segunda solicitud aquí
        if (response2.data.status == "FAILED") {
          res.send("Búsqueda fallida");
          return
        }

        if (response2.data.status == "IN PROGRESS") {
          res.send("Búsqueda en progreso");
          return
        }

        if (response2.data.status === "READY") {

          const data = JSON.stringify({
            "query_id": id_busqueda,
            "selection": {},
            "key": process.env.NEXT_PUBLIC_ADVANTECH_PRIVATE_KEY,
          });

          const config = {
            method: 'post',
            url: `${process.env.NEXT_PUBLIC_ADVANTECH_PRIVATE_URL}/data/get_full_data`,
            headers: {
              'Content-Type': 'application/json'
            },
            data: data,
            httpsAgent: new https.Agent({ rejectUnauthorized: false }),
          };

          const datos = await axios(config);

          res.send(datos.data.data)
        }

      } catch (error) {
        console.error('Error en la segunda solicitud con axios:', error);
        res.status(500).send('Error interno del servidor en la segunda solicitud con axios');
      }
    } else {
      res.send("Apikey incorrecta");
    }
  } catch (error) {
    console.error('Error en la primera solicitud con axios:', error);
    res.status(500).send('Error interno del servidor en la primera solicitud con axios');
  }
});

/**
 * @openapi
 * /historial-de-busqueda:
 *   get:
 *     summary: Obtener historial de búsqueda para un usuario
 *     tags:
 *       - HistorialDeBusqueda
 *     description: |
 *       Recupera el historial de búsqueda para un usuario basado en la API key proporcionada.
 *       Valida la cuenta, la API key y la fecha de vencimiento antes de proceder con la recuperación del historial.
 *     parameters:
 *       - in: query
 *         name: apikey
 *         required: true
 *         description: La API key asociada con la cuenta.
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Respuesta exitosa
 *         content:
 *           application/json:
 *             example:
 *               historial: [{ /* Tu estructura de historial aquí * / }]
 *       400:
 *         description: Parámetros de solicitud inválidos
 *         content:
 *           application/json:
 *             example:
 *               messages:
 *                 - "Parámetros de solicitud inválidos"
 *       401:
 *         description: No autorizado - La API key es incorrecta
 *         content:
 *           application/json:
 *             example:
 *               messages:
 *                 - "Apikey incorrecta"
 *       403:
 *         description: Prohibido - La cuenta está vencida
 *         content:
 *           application/json:
 *             example:
 *               messages:
 *                 - "La cuenta está vencida"
 *       404:
 *         description: Usuario no encontrado
 *         content:
 *           application/json:
 *             example:
 *               messages:
 *                 - "Usuario no encontrado"
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             example:
 *               messages:
 *                 - "Error interno del servidor"
 */

router.get("/historial-de-busqueda", async (req, res) => {
  const { apikey } = req.body;

  try {
    // Primera solicitud con axios
    const response = await axios.get(`${process.env.NEXT_PUBLIC_STRAPI_API_URL}/auth0users?populate=*`, {
      params: {
        "filters[apikey][$eq]": apikey,
      },
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.NEXT_PUBLIC_STRAPI_API_KEY}`,
      },
    });

    if (response.status !== 200) {
      throw new Error(`Failed to fetch data, ${response.status}`);
    }

    const usuario = response.data;

    if (usuario.data.length < 1) {
      res.send("Usuario no encontrado");
      return;
    }

    const email = usuario.data[0]?.attributes?.email;
    const userapikeystrapi = usuario.data[0]?.attributes?.apikey;
    const vencimientoPlan = new Date(usuario.data[0]?.attributes?.vencimiento);
    const creditosusuario = usuario.data[0].attributes.creditos
    const usuarioid = usuario.data[0].id
    const usuarioplanid = usuario.data[0].attributes.plan?.data.id

    // Validar si la cuenta está vencida
    const currentDate = new Date();
    if (vencimientoPlan < currentDate) {
      res.send("La cuenta está vencida");
      return;
    }
    // Validar si la apikey es la correcta
    if (userapikeystrapi === apikey) {
      try {  
        let historial = await pedirHistorialCompleto(email)
        res.send(buscarHistorialDeBusqueda(historial));
      } catch (error) {
        console.error('Error en la segunda solicitud con axios:', error);
        res.status(500).send('Error interno del servidor en la segunda solicitud con axios');
      }
    } else {
      res.send("Apikey incorrecta");
    }
  } catch (error) {
    console.error('Error en la primera solicitud con axios:', error);
    res.status(500).send('Error interno del servidor en la primera solicitud con axios');
  }
});

function buscarHistorialDeBusqueda(respuesta) {
  const historiales = respuesta.data[0].attributes.historials.data;

  // Filtrar y seleccionar los elementos con 'creditos' menores a 0
  const historialesSeleccionados = historiales
    .filter(historial => historial.attributes.creditos < 0)
    .map(historial => {
      return {
        fecha: historial.attributes.fecha,
        creditos: historial.attributes.creditos,
        consulta: historial.attributes.consulta,
        id_busqueda: historial.attributes.query_id
      };
    });

  // Ahora 'historialesSeleccionados' contiene solo los elementos con 'creditos' menores a 0
  console.log(historialesSeleccionados);

  return historialesSeleccionados;
}

async function pedirHistorialCompleto(email) {
  try {
    let config = {
      method: 'get',
      maxBodyLength: Infinity,
      url: 'https://dev.advantech.com.ec:1334/api/auth0users?filters[email][$eq]='+email+'&populate=historials.*',
      headers: { 
        'Authorization': 'Bearer 2d94f73c95c1de311f77de3acce929a2d0f2fdee17e3cb512e62f481197d019b836741f0e914d00085b3a79fcc6025f8c7611402cf4ad43c977a24b44190a73045cdfbc761e1acdbd87a5ad9a05c47c023363d7529e480086eeda412302bc420b1cefc092f532cb804c13ee7fc7a104621741516b2486f303f0f382e2ecb7013'
      }
    };
    const response = await axios.request(config);
    return response.data;
  } catch (error) {
    console.error('Error en la segunda solicitud con axios:', error);
    throw error; // Lanzar el error para que sea capturado por el bloque catch en miFuncion
  }
}
module.exports = router;