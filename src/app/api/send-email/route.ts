import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { getAdminDb } from '@/lib/firebase/admin';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
    try {
        const apiKey = process.env.RESEND_API_KEY;
        if (!apiKey) {
            console.error('RESEND_API_KEY is missing');
            return NextResponse.json({
                error: 'RESEND_API_KEY no configurada en el servidor'
            }, { status: 500 });
        }

        const resend = new Resend(apiKey);

        let adminDb;
        try {
            adminDb = getAdminDb();
            if (!adminDb) throw new Error('getAdminDb() returned null without throwing');
        } catch (initError: any) {
            console.error('Firebase Admin Init Failure:', initError.message);
            return NextResponse.json({
                error: 'Error de Inicialización de Base de Datos',
                details: initError.message
            }, { status: 500 });
        }

        // Fetch all admins
        const adminsSnapshot = await adminDb.collection('users').where('role', '==', 'admin').get();
        const adminEmails = adminsSnapshot.docs
            .map((doc: any) => doc.data().email)
            .filter((email: string) => email);

        if (adminEmails.length === 0) {
            return NextResponse.json({ message: 'No admins found' }, { status: 200 });
        }

        const body = await request.json();
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
            date,
            issues // New field for consolidated checklist issues
        } = body;

        const formattedDate = new Date(date).toLocaleString('es-ES', {
            dateStyle: 'full',
            timeStyle: 'short'
        });

        let subject = `[ALERTA] Nueva Incidencia de ${type === 'vehicle' ? 'Vehículo' : type === 'checklist' ? 'Checklist' : 'Material'}`;
        if (type === 'vehicle') subject += ` - ${vehiclePlate}`;
        else if (type === 'material') subject += ` - ${itemName}`;
        else if (type === 'checklist') subject += ` - ${vehiclePlate}`;

        // Basic HTML Template
        const htmlContent = `
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">
            <style>
                body { 
                    font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; 
                    line-height: 1.6; 
                    color: #1a1a1a; 
                    background-color: #f0f2f5;
                    margin: 0;
                    padding: 0;
                }
                .wrapper {
                    padding: 40px 20px;
                }
                .container { 
                    max-width: 600px; 
                    margin: 0 auto; 
                    background-color: #ffffff; 
                    border-radius: 12px; 
                    overflow: hidden;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
                }
                .header { 
                    background-color: ${type === 'checklist' ? '#f59e0b' : '#dc2626'}; 
                    color: white; 
                    padding: 30px; 
                    text-align: center; 
                }
                .header h2 {
                    margin: 0;
                    font-size: 24px;
                    font-weight: 700;
                    letter-spacing: -0.5px;
                }
                .header-subtitle {
                    margin-top: 8px;
                    font-size: 14px;
                    opacity: 0.9;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                }
                .content { 
                    padding: 30px; 
                }
                .section-title {
                    font-size: 12px;
                    font-weight: 700;
                    color: #64748b;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                    margin-bottom: 12px;
                    display: block;
                }
                .info-grid {
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    gap: 16px;
                    margin-bottom: 24px;
                    background-color: #f8fafc;
                    padding: 20px;
                    border-radius: 8px;
                    border: 1px solid #e2e8f0;
                }
                .info-item {
                    margin-bottom: 0;
                }
                .info-label {
                    font-size: 11px;
                    font-weight: 600;
                    color: #94a3b8;
                    display: block;
                    margin-bottom: 2px;
                }
                .info-value {
                    font-size: 14px;
                    font-weight: 600;
                    color: #334155;
                }
                .issues-container {
                    margin-top: 24px;
                }
                .issue-card { 
                    margin-bottom: 16px; 
                    padding: 20px; 
                    border-radius: 8px;
                    background-color: #fffbeb; 
                    border: 1px solid #fde68a;
                    position: relative;
                }
                .issue-card::before {
                    content: '⚠️';
                    position: absolute;
                    left: 16px;
                    top: 20px;
                    font-size: 18px;
                }
                .issue-content {
                    padding-left: 32px;
                }
                .issue-label { 
                    font-size: 15px;
                    font-weight: 700; 
                    color: #92400e; 
                    display: block;
                    margin-bottom: 4px;
                }
                .issue-comment { 
                    font-size: 14px;
                    color: #b45309; 
                    line-height: 1.5;
                }
                .description-box { 
                    padding: 20px;
                    background-color: #fff1f2; 
                    border: 1px solid #fecdd3; 
                    border-radius: 8px;
                    color: #881337; 
                    font-size: 15px;
                    margin-top: 10px;
                }
                .image-container { 
                    margin-top: 30px; 
                    text-align: center;
                    padding: 20px;
                    background-color: #f8fafc;
                    border-radius: 8px;
                    border: 1px solid #e2e8f0;
                }
                .image-container img { 
                    max-width: 100%; 
                    border-radius: 6px; 
                    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                }
                .footer { 
                    margin-top: 30px; 
                    text-align: center; 
                    font-size: 12px; 
                    color: #94a3b8;
                    padding-bottom: 20px;
                }
                .btn-container {
                    text-align: center;
                    margin-top: 32px;
                }
                .btn { 
                    display: inline-block; 
                    background-color: #0f172a; 
                    color: #ffffff !important; 
                    padding: 14px 28px; 
                    text-decoration: none; 
                    border-radius: 6px; 
                    font-size: 14px;
                    font-weight: 700; 
                    transition: background-color 0.2s;
                }
            </style>
        </head>
        <body>
            <div class="wrapper">
                <div class="container">
                    <div class="header">
                        <div class="header-subtitle">Gestión de Flota - Marcha Fúnebre</div>
                        <h2>${type === 'checklist' ? 'Incidencias en Checklist' : 'Nueva Incidencia Reportada'}</h2>
                    </div>
                    <div class="content">
                        <span class="section-title">Detalles del Reporte</span>
                        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 24px;">
                            <tr>
                                <td style="padding: 20px;">
                                    <table width="100%" border="0" cellspacing="0" cellpadding="0">
                                        <tr>
                                            <td width="50%" style="padding-bottom: 12px;">
                                                <span class="info-label">TIPO</span>
                                                <span class="info-value">${type === 'vehicle' ? 'Vehículo' : type === 'checklist' ? 'Checklist Pre-Viaje' : 'Material'}</span>
                                            </td>
                                            <td width="50%" style="padding-bottom: 12px;">
                                                <span class="info-label">FECHA</span>
                                                <span class="info-value">${formattedDate}</span>
                                            </td>
                                        </tr>
                                        <tr>
                                            <td width="50%">
                                                <span class="info-label">REPORTADO POR</span>
                                                <span class="info-value">${reporterName}</span>
                                            </td>
                                            <td width="50%">
                                                <span class="info-label">${(type === 'vehicle' || type === 'checklist') ? 'VEHÍCULO' : 'ELEMENTO'}</span>
                                                <span class="info-value">${(type === 'vehicle' || type === 'checklist') ? vehiclePlate : itemName}</span>
                                            </td>
                                        </tr>
                                    </table>
                                </td>
                            </tr>
                        </table>

                        ${type === 'checklist' && issues && issues.length > 0 ? `
                        <span class="section-title">Incidencias Detectadas (${issues.length})</span>
                        <div class="issues-container">
                            ${issues.map((issue: any) => `
                                <div class="issue-card">
                                    <div class="issue-content">
                                        <span class="issue-label">${issue.label}</span>
                                        <div class="issue-comment">${issue.comment || 'Sin observaciones adicionales proporcionadas por el conductor.'}</div>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                        ` : ''}

                        ${severity && type !== 'checklist' ? `
                        <div style="margin-top: 24px;">
                            <span class="section-title">Severidad / Prioridad</span>
                            <div style="padding: 8px 12px; background-color: ${severity === 'high' || severity === 'critical' ? '#fee2e2' : '#f3f4f6'}; color: ${severity === 'high' || severity === 'critical' ? '#991b1b' : '#374151'}; border-radius: 4px; display: inline-block; font-size: 13px; font-weight: 700; text-transform: uppercase;">
                                ${severity}
                            </div>
                        </div>
                        ` : ''}

                        ${description && type !== 'checklist' ? `
                        <div style="margin-top: 24px;">
                            <span class="section-title">Descripción del Problema</span>
                            <div class="description-box">${description}</div>
                        </div>
                        ` : ''}

                        ${imageUrl ? `
                        <div class="image-container">
                            <span class="section-title">Evidencia Fotográfica</span>
                            <img src="${imageUrl}" alt="Evidencia de incidencia" />
                            <p style="margin-top: 12px;"><a href="${imageUrl}" target="_blank" style="color: #dc2626; font-size: 13px; font-weight: 600; text-decoration: none;">Ampliar imagen →</a></p>
                        </div>
                        ` : ''}

                        ${incidentId ? `
                        <div class="btn-container">
                            <a href="https://marcha-funebre.web.app/admin/incidents/${incidentId}" class="btn">Gestionar Incidencia</a>
                        </div>
                        ` : ''}
                    </div>
                </div>
                <div class="footer">
                    Este mensaje ha sido generado automáticamente por el sistema Marcha Fúnebre.<br>
                    Por favor, no responda a este correo electrónico.
                </div>
            </div>
        </body>
        </html>
        `;

        const data = await resend.emails.send({
            from: 'Marcha Fúnebre <onboarding@resend.dev>',
            to: adminEmails,
            subject: subject,
            html: htmlContent,
        });

        return NextResponse.json(data);
    } catch (error: any) {
        console.error('Detailed Resend/API Error:', error.message);
        return NextResponse.json({
            error: error.message || 'Error desconocido'
        }, { status: 500 });
    }
}
