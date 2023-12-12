const axios = require('axios');
const express = require('express');
const router = express.Router();
const https = require('https');

// Resto de tu código aquí

router.get("/micuenta", async (req, res) => {

  const { email, apikey } = req.body;

  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_STRAPI_API_URL}/auth0users?filters[email][$eq]=${email}`, {

      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.NEXT_PUBLIC_STRAPI_API_KEY}`,
      },
      cache: "no-store",
    });
    if (response.status !== 200) {
      throw new Error(`Failed to fetch data, ${response.status}`);
    }

    const usuario = await response.json();
    const userapikeystrapi = usuario.data[0].attributes.apikey;
    const vencimientoPlan = new Date(usuario.data[0].attributes.vencimiento);


    // Validar si la cuenta está vencida
    const currentDate = new Date();
    if (vencimientoPlan < currentDate) {
      res.send("La cuenta está vencida");
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
      res.send(micuenta);
    } else {
      res.send("Apikey erronea");
    }

  } catch (error) {
    throw new Error(`Failed to fetch data, ${error}`);
  }

});


router.get("/busqueda", async (req, res) => {
  const { email, apikey, sujetos, fuente } = req.body;

  try {
    // Primera solicitud con axios
    const response = await axios.get(`${process.env.NEXT_PUBLIC_STRAPI_API_URL}/auth0users?populate=*&`, {
      params: {
        "filters[email][$eq]": email,
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


router.get("/datos", async (req, res) => {
  const { email, apikey, id_busqueda } = req.body;

  try {
    // Primera solicitud con axios
    const response = await axios.get(`${process.env.NEXT_PUBLIC_STRAPI_API_URL}/auth0users?populate=*&`, {
      params: {
        "filters[email][$eq]": email,
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

module.exports = router;