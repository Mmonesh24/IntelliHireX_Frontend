// Small API helper for auth endpoints
export async function registerUser({ name, email, password, role }) {
	const res = await fetch('http://localhost:8080/api/auth/register', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({ name, email, password, role }),
	})

	const data = await res.json()

	if (!res.ok) {
		// Try to extract error message
		const message = data?.message || data?.error || 'Registration failed'
		throw new Error(message)
	}

	return data
}
