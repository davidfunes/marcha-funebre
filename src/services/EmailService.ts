
interface IncidentEmailData {
    type: 'vehicle' | 'material' | 'checklist';
    title: string;
    description: string;
    incidentId?: string;
    reporterName: string;
    vehiclePlate?: string;
    itemName?: string;
    severity?: string;
    imageUrl?: string;
    date: Date;
    issues?: Array<{ label: string, comment: string }>;
}

export const EmailService = {
    /**
     * Sends an email alert for a reported incident.
     */
    sendIncidentAlert: async (data: IncidentEmailData): Promise<boolean> => {
        try {
            const response = await fetch('/api/send-email', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error('Failed to send email alert:', errorData);
                return false;
            }

            return true;
        } catch (error) {
            console.error('Error sending email alert:', error);
            return false;
        }
    }
};
