const {buffer} = require('micro');
const Stripe = require('stripe');
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
const {createClient} = require("@supabase/supabase-js");

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);


module.exports.config = {
    api: {
        bodyParser: false
    }
}

module.exports = async (req, res) => {
    if(req.method !== "POST") {
        return res.status(405).send("Method not allowed");
    }

    let event;
    const sig = req.headers['stripe-signature'];
    const buf = await buffer(req);

    try {
        event = stripe.webhooks.constructEvent(buf, sig, process.env.STRIPE_WEBHOOK_SECRET);

    } catch (error) {
        console.error("Webhook error:", error);
        return res.status(400).send(`Webhook Error: ${error.message}`);
    }

    if(event.type === "checkout.session.completed") {
        const session = event.data.object;

        const customer = session.customer_details || {};
        const adress = customer.address || {};
        const fullAdress = `${adress.line1 || ''}, ${adress.city || ''}, ${adress.postal_code || ''}`;

       /* const insertData = {
            set_name: "Набор макарон с индивидуальным дизайном",
            customer_name: String(customer.name || ''),
            phone: String(customer.phone || ''),
            delivery_method: "Доставка",
            delivery_datetime: '',
            comment: '',
            payment_method: "online by card",
            delivery_adress: String(fullAdress),
        }*/

        const {error} = await supabase.from('orders').insert([{
            set_name: "Проверка из stripe",
            customer_name: "тестовый пидорас"
        }]);

        if(error) {
            console.error("Error inserting data to supabase", error);
            return res.status(500).send("failed to insert data to supabase");
        }
        console.log("Data inserted to supabase");
    }

    res.status(200).json({received: true});
}