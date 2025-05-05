import {buffer} from 'micro'
import stripe from 'stripe'
import {createClient} from "@supabase/supabase-js";

const stripe = new stripe(process.env.STRIPE_SECRET_KEY)
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY)

export const config = {
    api: {
        bodyParser: false
    }
}

export default async function handler(req, res) {
    if(req.method !== 'POST') {
        return res.status(405).end("Method not allowed")
    }

    const buf = await buffer(req)
    const sig = req.headers['stripe-signature']
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET

    let event;

    try {
        event = stripe.webhooks.constructEvent(buf, sig, endpointSecret)
    } catch (error) {
        console.error("Stipe webkook error:", error.message)
        return res.status(400).send(`Webhook Error: ${error.message}`)
    }

    if(event.type === 'checkout.session.completed') {
        const session = event.data.object;

        const email = session.customer_details?.email || ""
        const name = session.shipping?.name || ""
        const adress = session.shipping?.address?.line1 || ""
        const total = session.amount_total
        const paymentIntent = session.payment_intent

        const {error} = await supabase.from('orders').insert({
            set_name: "Набор макарон с индивидуальным дизайном",
            customer_name: name,
            delivery_adress: adress,
            comment: email,
            amount_total: total,
            payment_intent: paymentIntent,
            created_at: new Date(session.created * 1000)
        })
        if(error) {
            console.error("Supabse insert error", error)
            return res.status(500).send("DB insert failed")
        }
    }

    res.status(200).json({received: true})

}