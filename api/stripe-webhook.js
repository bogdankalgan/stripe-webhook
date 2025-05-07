/*
const {buffer} = require('micro')
const Stripe = require('stripe')
const {createClient} = require("@supabase/supabase-js")

const stripe = Stripe(process.env.STRIPE_SECRET_KEY)
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

module.exports.config = {
    api: {
        bodyParser: false
    }
}

module.exports = async function handler(req, res) {
    if(req.method !== 'POST') {
        return res.status(405).send('Method not allowed')
    }

    console.log('Webhook received')

    const buf = await buffer(req)
    const sig = req.headers['stripe-signature']
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET

    console.log("Keys: ", {
        STRIPE_SECRET_KEY: !!process.env.STRIPE_SECRET_KEY,
        STRIPE_WEBHOOK_SECRET: !!process.env.STRIPE_WEBHOOK_SECRET,
        SUPABASE_URL: !!process.env.SUPABASE_URL,
        SUPABASE_KEY: !!process.env.SUPABASE_KEY,
    })

    let event;

    try {
        event = stripe.webhooks.constructEvent(buf, sig, endpointSecret)
        console.log("Event constructed", event.type)
    } catch (error) {
        console.error("Stripe constructEvent error: ", error)
        return res.status(400).send(`Webhook Error: ${error.message}`)
    }

    if(event.type === 'checkout.session.completed') {
        const session = event.data.object;
        console.log("Checkout session: ", session)

        const email = session.customer_details?.email || ' '
        const name = session.shipping?.name || ' '
        const phone = session.customer_details?.phone || ' '
        const adress = session.shipping?.address?.line1 || ' '

        const {error} = await supabase.from('orders').insert([{
            set_name: "Набор макарон",
            customer_name: name || '',
            phone: phone || '',
            delivery_method: '',
            delivery_datetime: '',
            comment: '',
            payment_method: 'card online',
            delivery_adress: adress || '',
            email: email || '',
        }])

        if(error) {
            console.error("Supabase insert error: ", JSON.stringify(error, null, 2))
            return res.status(500).send('DB insert failed')
        }
        console.log("Order saved to Supabase")
    }
    res.status(200).json({received: true})
}*/


const {stripe} = require('stripe')(process.env.STRIPE_SECRET_KEY)
const {buffer} = require('micro')
const {createClient} = require("@supabase/supabase-js")

console.log("SUPABASE_KEY exists: ", Boolean(process.env.SUPABASE_KEY))
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

module.exports = async (req, res) => {
    if(req.method !== 'POST') {
        return res.status(405).send('Method not allowed')
    }

    const sig = req.headers['stripe-signature']
    let event;

    const buf = await buffer(req)

    try{
        event = stripe.webhooks.constructEvent(buf, sig, process.env.STRIPE_WEBHOOK_SECRET)
    } catch(error) {
        console.error("Webhook signature verification failed. ", error)
        return res.status(400).send(`Webhook Error: ${error.message}`)
    }

    if(event.type === 'checkout.session.completed') {
        const session = event.data.object;

        const adress = session.customer_details?.address
        const fullAddress = adress ? `${adress.line1 || ""}, ${adress.city || ""}, ${adress.postal_code || ""}`: ''

        const dataToInsert = {
            set_name: "custom set",
            costomer_name: session.customer_details?.name || '',
            phone: session.customer_details?.phone || '',
            delivery_method: "доставка",
            delivery_datetime: "",
            comment: "",
            payment_method: session.payment_method_types[0] || '',
            delivery_adress: fullAddress || '',
        }

        try {
            const {error} = await supabase.from('orders').insert([dataToInsert])

            if(error) {
                console.error("Supabase insert error: ", error.message)
                return res.status(500).send(`Supabase insert failed: ${error.message}`)
            }
            return res.status(200).send('Order saved to Supabase')
        } catch(error) {
            console.error("Unexpected error: ", error.message)
            return res.status(500).send(`error: ${error.message}`)
        }
    }
    return res.status(200).send('OK')
}

module.exports.config = {
    api: {
        bodyParser: false
    }
}