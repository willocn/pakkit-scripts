/*
This is a work in progress tool that I use to test knockback on servers.
*/

const uuid = "25a0048f-d105-4a57-b2f6-2ee88b87d684"; // i dont know how to get this in realtime so this will have to do.

let firstPass = true;
let playerEntityId = undefined;
let ping = undefined;

const DELTA_QUEUE_SIZE = 5; // this should be at least ceil(ping / 50)
let deltas = [];
let prevX = undefined;
let prevY = undefined;
let prevZ = undefined;

exports.upstreamHandler = function (meta, data, server, client) {

    // modify packet before here
    server.sendPacket(meta, data)

    if (firstPass && meta.name === "flying") {
        sendClientChat(client, "VelocitySnooper enabled!")
        sendClientChat(client, "move around to get player eid")
        firstPass = false;
    }
    // if (meta.name === 'chat') {
    //     data.message = data.message + "swag"
    //     sendClientChat(client, `you said ${data.message}`)
    // }

    if (meta.name === "entity_action") {
        if (playerEntityId != data.entityId) {
            playerEntityId = data.entityId;
            sendClientChat(client, `player eid is ${playerEntityId}`)
        }
    }

    if (meta.name === "position" || meta.name === "position_look") {
        let { x, y, z } = data;
        if (!prevX) {
            [prevX, prevY, prevZ] = [x, y, z] // initialize
        }

        let dx = x - prevX;
        let dy = y - prevY;
        let dz = z - prevZ;

        if (deltas.length >= DELTA_QUEUE_SIZE) {
            deltas.shift()
        }
        deltas.push({ dx, dy, dz });

        [prevX, prevY, prevZ] = [x, y, z]

        // sendClientChat(client, dx);
        // sendClientChat(client, dy);
        // sendClientChat(client, dz);

    }

}

// Handles packets going from the server to the client
exports.downstreamHandler = function (meta, data, server, client) {

    // modify packet before here

    client.sendPacket(meta, data)

    if (meta.name === "entity_velocity") {
        if (data.entityId === playerEntityId) {
            sendClientChat(client, `X: ${fixedToFloat(data.velocityX)}`)
            sendClientChat(client, `Y: ${fixedToFloat(data.velocityY)}`)
            sendClientChat(client, `Z: ${fixedToFloat(data.velocityZ)}`)

            let lookback = 0;
            if (ping) {
                lookback = Math.ceil(ping / 50.0); // this wont work if the server doesnt report back ping, pick a sane value manually 
            }

            let {dx, dy, dz} = deltas[deltas.length - 1 - lookback];
            sendClientChat(client, `deltas from ${lookback} ticks ago`)
            sendClientChat(client, dx)
            sendClientChat(client, dy)
            sendClientChat(client, dz)


        }
    }

    if (meta.name === "player_info" && data.action === 2) {
        for (const player of data.data) {
            if (player.UUID === uuid) {
                ping = player.ping;
            }
        }
    }
}

function sendClientChat(client, message) {
    const resp = {
        "text": "",
        "extra": [
            {
                "text": "[",
                "bold": false
            },
            {
                "text": "vs",
                "color": "blue",
                "bold": false
            },
            {
                "text": "] ",
                "bold": false
            },
            {
                "text": message
            }
        ]
    };

    client.sendPacket("chat", {
        "message": JSON.stringify(resp),
        "position": 0
    });
    return;
}

function fixedToFloat(fixed) {
    return fixed / 8000.0
}