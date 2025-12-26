
import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { adminDb } from '@/lib/firebase/admin';

const resend = new Resend(process.env.RESEND_API_KEY);

// Use onboarding@resend.dev for Resend accounts in test mode (authorized by default to the owner)

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
    try {
        if (!adminDb) {
            console.error('Admin DB not initialized. Check environment variables.');
            return NextResponse.json({ error: 'Internal Server Error (Database)' }, { status: 500 });
        }

        // Fetch all admins
        const adminsSnapshot = await adminDb.collection('users').where('role', '==', 'admin').get();
        const adminEmails = adminsSnapshot.docs
            .map((doc: any) => doc.data().email)
            .filter((email: string) => email); // Filter out undefined/null/empty

        if (adminEmails.length === 0) {
            console.warn('No admin emails found to send alert to.');
            // Fallback to a safety email if needed, or simply log.
            // For now, we return, as sending to empty list throws error.
            return NextResponse.json({ message: 'No admins found' }, { status: 200 });
        }
        const {
            type,
            title,
            description,
            incidentId,
            reporterName,
            vehiclePlate,
            itemName,
            severity,
            imageUrl,
            date
        } = await request.json();

        const formattedDate = new Date(date).toLocaleString('es-ES', {
            dateStyle: 'full',
            timeStyle: 'short'
        });

        const subject = `[ALERTA] Nueva Incidencia de ${type === 'vehicle' ? 'Vehículo' : 'Material'} - ${type === 'vehicle' ? vehiclePlate : itemName}`;

        // Basic HTML Template
        const htmlContent = `
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">
            <style>
                body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px; background-color: #f9fafb; }
                .header { background-color: #dc2626; color: white; padding: 15px; border-radius: 8px 8px 0 0; text-align: center; }
                .content { padding: 20px; background-color: white; border-radius: 0 0 8px 8px; border: 1px solid #e0e0e0; border-top: none; }
                .field { margin-bottom: 12px; }
                .label { font-weight: bold; color: #555; display: block; margin-bottom: 4px; font-size: 0.9em; text-transform: uppercase; }
                .value { background-color: #f3f4f6; padding: 8px 12px; border-radius: 4px; border: 1px solid #e5e7eb; }
                .description { white-space: pre-wrap; background-color: #fff1f2; border: 1px solid #fecdd3; color: #881337; }
                .image-container { margin-top: 20px; text-align: center; }
                .image-container img { max-width: 100%; border-radius: 8px; border: 1px solid #e5e7eb; }
                .footer { margin-top: 20px; text-align: center; font-size: 0.8em; color: #6b7280; }
                .btn { display: inline-block; background-color: #1f2937; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; margin-top: 20px; font-weight: bold; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h2 style="margin:0;">🚨 Nueva Incidencia Reportada</h2>
                </div>
                <div class="content">
                    <div class="field">
                        <span class="label">Tipo de Incidencia</span>
                        <div class="value">${type === 'vehicle' ? 'Vehículo' : 'Material'}</div>
                    </div>
                    
                    <div class="field">
                        <span class="label">Reportado Por</span>
                        <div class="value">${reporterName}</div>
                    </div>

                    <div class="field">
                        <span class="label">Fecha</span>
                        <div class="value">${formattedDate}</div>
                    </div>

                    ${type === 'vehicle' ? `
                    <div class="field">
                        <span class="label">Vehículo</span>
                        <div class="value"><strong>${vehiclePlate}</strong></div>
                    </div>
                    ` : `
                    <div class="field">
                        <span class="label">Item de Inventario</span>
                        <div class="value"><strong>${itemName}</strong></div>
                    </div>
                    `}

                    ${severity ? `
                    <div class="field">
                        <span class="label">Severidad / Estado</span>
                        <div class="value">${severity}</div>
                    </div>
                    ` : ''}

                    <div class="field">
                        <span class="label">Descripción del Problema</span>
                        <div class="value description">${description}</div>
                    </div>

                    ${imageUrl ? `
                    <div class="image-container">
                        <span class="label">Evidencia Fotográfica</span>
                        <img src="${imageUrl}" alt="Evidencia de incidencia" />
                        <p><a href="${imageUrl}" target="_blank" style="color: #dc2626; font-size: 0.9em;">Ver imagen a tamaño completo</a></p>
                    </div>
                    ` : ''}

                    <div style="text-align: center;">
                        <a href="https://marcha-funebre.web.app/admin/incidents/${incidentId}" class="btn">Ver en Dashboard</a>
                    </div>
                </div>
                <div class="footer">
                    <p>Este es un mensaje automático del sistema de gestión Marcha Fúnebre.</p>
                </div>
            </div>
        </body>
        </html>
        `;

        const data = await resend.emails.send({
            from: 'Marcha Fúnebre <onboarding@resend.dev>', // Use default testing domain or configured domain
            to: adminEmails,
            subject: subject,
            html: htmlContent,
        });

        return NextResponse.json(data);
    } catch (error) {
        console.error('Resend Error:', error);
        return NextResponse.json({ error }, { status: 500 });
    }
}
