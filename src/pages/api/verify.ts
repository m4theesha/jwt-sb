import * as jwt from "jwtkn"

export const runtime = 'edge'

const secret = process.env.SECRET

export default async function handler(req: Request) {
    const body = await req.json()
    const isValid = await jwt.verify(body.token, secret ?? '', true)

    return new Response(JSON.stringify({ isValid }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
    })
}