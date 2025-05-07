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


const { buffer } = require('micro');
const Stripe = require('stripe');
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        res.status(405).send('Method Not Allowed');
        return;
    }

    const sig = req.headers['stripe-signature'];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event;
    const buf = await buffer(req);

    try {
        event = stripe.webhooks.constructEvent(buf, sig, endpointSecret);
    } catch (err) {
        console.error('Webhook Error:', err.message);
        res.status(400).send(`Webhook Error: ${err.message}`);
        return;
    }

    if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        const customer = session.customer_details || {};
        const address = customer.address || {};

        const { error } = await supabase.from('orders').insert([
            {
                set_name: 'Custom Set',
                customer_name: String(customer.name || ''),
                phone: String(customer.phone || ''),
                delivery_adress: String(`${address.city || ''}, ${address.line1 || ''}, ${address.postal_code || ''}`),
                delivery_method: 'delivery',
                delivery_datetime: new Date().toISOString(),
                comment: '',
                payment_method: 'card',
            },
        ]);

        if (error) {
            console.error('Supabase insert error full:', JSON.stringify(error, null, 2));
            res.status(500).json({ error: error.message });
            return;
        }
    }

    res.status(200).json({ received: true });
};

module.exports.config = {
    api: {
        bodyParser: false,
    },
};