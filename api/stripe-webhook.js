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
        event  = stripe.webhooks.constructEvent(buf, sig, endpointSecret)
    } catch (err) {
        console.error("Stripe Webhook Error: ", err.message)
        return res.status(400).end(`Webhook Error: ${err.message}`)
    }

    if(event.type === 'checkout.session.completed') {
        const session = event.data.object;

        const email = session.customer_details?.email || '';
        const name = session.shipping?.name || ''
        const phone = session.customer_details?.phone || ''
        const address = session.shipping?.address?.line1 || ''
        const total = session.amount_total;
        const paymentIntent = session.payment_intent;

        const {error } = await supabase.from('orders').insert([{
            set_name: "Набор макарон",
            customer_name: name,
            phone,
            delivery_method: "",
            deliver_datetime: '',
            comment:'',
            delivery_address: address, email,
            payment_intent: paymentIntent,
            created_at: new Date(session.created * 1000),
        }])

        if(error) {
            console.error("Supabase insert error: ", error)
            return res.status(500).send("DB insert failed")
        }
    }

    res.status(200).json({received: true})
}