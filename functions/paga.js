export async function onRequestPost({ request, env }) {
    try {
        const body = await request.json();
        const { items, orderId } = body;

        // Recupera le chiavi da Cloudflare
        const SUMUP_API_KEY = env.SUMUP_SECRET_KEY;
        const MERCHANT_EMAIL = env.SUMUP_EMAIL;

        // 1. CONTROLLO CLOUDFLARE: Le variabili esistono?
        if (!SUMUP_API_KEY || !MERCHANT_EMAIL) {
            return new Response(JSON.stringify({ 
                error: "ERRORE CLOUDFLARE: La variabile SUMUP_SECRET_KEY o SUMUP_EMAIL è vuota. Se le hai inserite in Cloudflare, devi fare un nuovo commit su GitHub per fare il Re-Deploy!" 
            }), { 
                status: 401, 
                headers: { "Content-Type": "application/json" } 
            });
        }

        // Calcolo totale
        let amount = items.reduce((acc, curr) => acc + (curr.price * curr.qty), 0);

        // Richiesta a SumUp
        const sumupResponse = await fetch('https://api.sumup.com/v0.1/checkouts', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${SUMUP_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                checkout_reference: orderId,
                amount: parseFloat(amount.toFixed(2)),
                currency: "EUR",
                pay_to_email: MERCHANT_EMAIL,
                description: `Ordine TORB - ${orderId}`
            })
        });

        const data = await sumupResponse.json();

        // 2. CONTROLLO SUMUP: La chiave è accettata?
        if (!sumupResponse.ok) {
            return new Response(JSON.stringify({ 
                error: "ERRORE SUMUP: Accesso negato (401). La chiave API inserita non è valida, è scaduta, oppure l'email è sbagliata.", 
                details: data 
            }), { 
                status: 401, 
                headers: { "Content-Type": "application/json" } 
            });
        }

        // 3. TUTTO OK: Ritorna il checkout
        return new Response(JSON.stringify({ checkoutId: data.id }), {
            status: 200,
            headers: { "Content-Type": "application/json" }
        });

    } catch (err) {
        return new Response(JSON.stringify({ error: "Errore interno del server", details: err.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
}