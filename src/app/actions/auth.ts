'use server';

import { adminAuth } from '@/lib/firebase/admin';
import { Resend } from 'resend';

// NOTE: Since the user wants "no action needed", I will use Resend.
// The user will need to add RESEND_API_KEY to .env.local eventually for it to work in production,
// but for development/testing I can explain where to get it easily.
const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Server Action to send a professional password reset email in Spanish.
 * It redirects directly to our custom landing page.
 */
export async function sendResetPasswordEmailAction(email: string) {
    try {
        // 1. Generate the reset link using Firebase Admin
        // This link will point to our custom page as configured in AuthContext
        const actionCodeSettings = {
            url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/auth/reset-password`,
            handleCodeInApp: true,
        };

        const link = await adminAuth.generatePasswordResetLink(email, actionCodeSettings);

        // 2. Extract the oobCode from the generated link to build our direct URL
        const url = new URL(link);
        const oobCode = url.searchParams.get('oobCode');

        if (!oobCode) throw new Error('No se pudo generar el código de recuperación.');

        const directLink = `${actionCodeSettings.url}?oobCode=${oobCode}`;

        // 3. Send the professional email in Spanish
        const { data, error } = await resend.emails.send({
            from: 'Marcha Fúnebre <onboarding@resend.dev>', // Default testing sender
            to: [email],
            subject: 'Restablece tu contraseña - Marcha Fúnebre',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #f0f0f0; border-radius: 10px;">
                    <div style="text-align: center; margin-bottom: 30px;">
                        <h1 style="color: #333; margin: 0;">Marcha Fúnebre</h1>
                        <p style="color: #666; font-size: 14px; margin: 5px 0 0 0;">Gestión de Flota y Material Musical</p>
                    </div>
                    
                    <div style="background-color: #f9f9f9; padding: 30px; border-radius: 8px;">
                        <h2 style="color: #1a1a1a; margin-top: 0;">Hola,</h2>
                        <p style="color: #444; line-height: 1.6; font-size: 16px;">
                            Has solicitado restablecer la contraseña de tu cuenta en <strong>Marcha Fúnebre</strong>. 
                            Pulsa el siguiente botón para elegir una nueva contraseña:
                        </p>
                        
                        <div style="text-align: center; margin: 40px 0;">
                            <a href="${directLink}" style="background-color: #000; color: #fff; padding: 15px 30px; text-decoration: none; borderRadius: 8px; font-weight: bold; font-size: 16px;">
                                Restablecer Contraseña
                            </a>
                        </div>
                        
                        <p style="color: #666; font-size: 14px; line-height: 1.5;">
                            Este enlace expirará en una hora. Si no has solicitado este cambio, puedes ignorar este correo de forma segura.
                        </p>
                    </div>
                    
                    <div style="text-align: center; margin-top: 30px; color: #999; font-size: 12px;">
                        <p>© 2025 Marcha Fúnebre. Todos los derechos reservados.</p>
                    </div>
                </div>
            `,
        });

        if (error) {
            console.error('Resend Error:', error);
            throw new Error('Error al enviar el correo técnico.');
        }

        return { success: true, data };
    } catch (error: any) {
        console.error('sendResetPasswordEmailAction Error:', error);
        throw new Error(error.message || 'Error al procesar la solicitud de recuperación.');
    }
}
