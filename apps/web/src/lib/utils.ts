export const getPasswordStrength = (password: string) => {
	if (!password) return { score: 0, label: "Weak", color: "bg-red-500" };

	let score = 0;

	if (password.length >= 8) score++;
	if (/[A-Z]/.test(password)) score++;
	if (/[0-9]/.test(password)) score++;
	if (/[@$!%*?&]/.test(password)) score++;

	const labels = ["Very Weak", "Weak", "Fair", "Strong", "Very Strong"];
	const colors = ["bg-error-500", "bg-warning-400", "bg-warning-600", "bg-success-300", "bg-success-500"];

	return {
		score,
		label: labels[score],
		color: colors[score],
	};
};
