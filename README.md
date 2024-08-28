# DOMEX: Ambiente distribuido Web para la ejecución de jobs MapReduce

El presente trabajo de grado consiste en la implementación de DOMEX (Distributed Online Mapreduce EXperience), una aplicación web la cual permite establecer un entorno distribuido donde se puede llevar a cabo la ejecución de jobs MapReduce. El entorno distribuido es administrado por la aplicación, la cual utiliza a los diferentes dispositivos que ingresan a la web como nodos de un clúster sobre los que se distribuye la carga de procesamiento. Toda la ejecución de los algoritmos tiene lugar en los navegadores de internet propios de cada estudiante. Además de ello permite subir los archivos (de tamaño limitado) que se desean procesar, trabajando como si se tratara con un HDFS (Hadoop Distributed File System).

## Pre-requisitos

- Docker: [Installation Guide](https://docs.docker.com/get-docker/)
- Docker Compose: [Installation Guide](https://docs.docker.com/compose/install/)

## Guía de instalación

1. Clonar el repositorio:

   ```shell
    git clone https://github.com/DavidScoffield/domex
   ```

2. Navegar al directorio del proyecto:

   ```shell
   cd domex
   ```

3. Configurar las variables de entorno

   Ver en la sección de **[Configuración](#configuración)** para más información.

4. Construir y levantar los contenedores de Docker:

   ```shell
   docker-compose up -d
   ```

5. Acceder a la aplicación en el navegador web:

   Abre tu navegador web y visita `http://<local-private-ip>:port`. (Reemplaza `port` con el número de puerto correspondiente).

6. Detener y eliminar los contenedores de Docker:

   ```shell
   docker-compose down
   ```

En caso de que se haya modificado el archivo `.env`, o el propio código fuente de la aplicación, es necesario reconstruir los contenedores de Docker:

```shell
docker-compose up -d --build
```

> Nota: Para más información sobre cómo obtener la dirección IP privada de la máquina host, consulte la sección de **[Private IP](#private_ip)**.

## Configuración

Es posible configurar ciertos aspectos de la aplicación a través de las variables de entorno en el archivo `.env`. A continuación se muestra un ejemplo de archivo `.env`:

```shell
# .env
PRIVATE_IP=

# Internal
FRONT_INTERNAL_PORT=
BACK_INTERNAL_PORT=
# External
EXTERNAL_HTTP_PORT=
EXTERNAL_HTTPS_PORT=

# App
NEXT_PUBLIC_ICESERVER=
NEXT_PUBLIC_SERVER_URL=

# Backend
CLUSTER_IDS_LENGTH=
```

#### + PRIVATE_IP:

> Nota: Este valor es **obligatorio** configurar.

Dirección IP privada de la máquina host. Se utiliza para configurar la dirección IP de los nodos del clúster.
Para obtener la dirección IP privada de la máquina host puede probar con el siguiente comando (requiere tener `npm` instalado):

```shell
cd frontend/ && npm run getIPWifi && cd ..
```

En caso que el comando anterior no funcione, puede obtener la dirección IP privada de la máquina host de la siguiente manera:

- Windows: `ipconfig`
- Linux: `ifconfig`
- MacOS: `ifconfig`

#### + FRONT_INTERNAL_PORT:

> Nota: No es necesario modificar este valor.

Puerto interno del contenedor de Docker donde se ejecuta la aplicación web.

#### + BACK_INTERNAL_PORT:

> Nota: No es necesario modificar este valor.

Puerto interno del contenedor de Docker donde se ejecuta el servidor de la aplicación.

#### + EXTERNAL_HTTP_PORT:

> Nota: No es necesario modificar este valor. La aplicación redirige automáticamente al puerto HTTPS `EXTERNAL_HTTPS_PORT` si se accede a través de HTTP.

Puerto externo del contenedor de Docker donde se expone la aplicación web.

#### + EXTERNAL_HTTPS_PORT:

Puerto externo del contenedor de Docker donde se expone la aplicación web con HTTPS. Es el puerto al que se debe acceder para utilizar la aplicación.

#### + NEXT_PUBLIC_ICESERVER:

> Nota: No es necesario modificar este valor. Por defecto, se utiliza el servidor de señalización local.

Parámetro de configuración para el servidor de señalización de WebRTC. Los valores posibles son `local`(por defecto) o `metered`.  
El valor `local` no utiliza un servidor de señalización externo, mientras que el valor `metered` utiliza un servidor de señalización externo (en este caso el perteneciente a la capa gratuita de [Metered](https://www.metered.ca/stun-turn).

> Para más información, consulte la documentación de [Simple-Peer](https://github.com/feross/simple-peer?tab=readme-ov-file#connection-does-not-work-on-some-networks)

#### + NEXT_PUBLIC_SERVER_URL:

> Nota: No modificar este valor.

URL del servidor para que la aplicación web pueda conectarse a la API REST y WebSocket del backend.

#### + CLUSTER_IDS_LENGTH:

Longitud de los identificadores de los clusters. Por defecto, el valor es `5`.

## Arquitectura

La aplicación está compuesta por dos partes principales: el frontend y el backend.

### Frontend

El frontend de la aplicación es una aplicación web desarrollada con [Next.js](https://nextjs.org/). La aplicación web se encarga de la interfaz de usuario y de la comunicación con el backend a través de una API REST y un WebSocket. La aplicación web utiliza [WebRTC](https://webrtc.org/) para la comunicación en tiempo real entre los nodos del clúster. Es la encargada de gestionar la distribución de los trabajos MapReduce entre los nodos del clúster.

### Backend

El backend de la aplicación es un servidor desarrollado con [Express.js](https://expressjs.com/) que se encarga de gestionar los clusters y la comunicación como servidor de señalización para WebRTC.
