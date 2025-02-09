document.addEventListener('DOMContentLoaded', () => {
    const successMessage = document.getElementById('success-message');

    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('success')) {
        successMessage.style.display = 'block';

        setTimeout(() => {
            successMessage.style.display = 'none';
        }, 3000);
    }
});

document.addEventListener('DOMContentLoaded', () => {
    const deleteButtons = document.querySelectorAll('.delete-button');

    deleteButtons.forEach(button => {
        button.addEventListener('click', async (event) => {
            const itemId = button.getAttribute('data-id');
            if (confirm('Are you sure you want to delete this item?')) {
                try {
                    const response = await fetch(`/delete-item/${itemId}`, { method: 'DELETE' });
                    if (response.ok) {
                        window.location.reload(); // רענון הדף
                    } else {
                        alert('Failed to delete the item');
                    }
                } catch (err) {
                    console.error('Error deleting item:', err);
                }
            }
        });
    });
});

