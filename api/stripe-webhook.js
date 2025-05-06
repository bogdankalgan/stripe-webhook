const {buffer} = require('micro')
const Stripe = require('stripe')
const {createClient} = require("@supabase/supabase-js")

const stripe = Stripe(process.env.STRIPE_SECRET_KEY)
const supabase = createCliend(process.env.SUPABASE_URL, process.env.SUPABASE_KEY)

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
            customer_name: name,
            phone: phone,
            delivery_method: '',
            delivery_datetime: '',
            comment: '',
            payment_method: 'card online',
            delivery_adress: adress,
            email: email,
        }])

        if(error) {
            console.error("Error: ", error)
            return res.status(500).send('DB insert failed')
        }
        console.log("Order saved to Supabase")
    }
    res.status(200).json({received: true})
}