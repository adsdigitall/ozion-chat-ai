// Ozion Chat AI - Main Application

document.addEventListener('DOMContentLoaded', function() {
    // Sidebar Toggle
    const sidebar = document.getElementById('sidebar');
    const menuToggle = document.getElementById('menuToggle');

    menuToggle.addEventListener('click', function() {
        sidebar.classList.toggle('collapsed');
    });

    // Navigation
    const navItems = document.querySelectorAll('.nav-item[data-page]');
    const pages = document.querySelectorAll('.page');

    navItems.forEach(item => {
        item.addEventListener('click', function() {
            const pageId = this.getAttribute('data-page');

            // Update active nav
            navItems.forEach(nav => nav.classList.remove('active'));
            this.classList.add('active');

            // Show page
            pages.forEach(page => page.classList.remove('active'));
            const targetPage = document.getElementById('page-' + pageId);
            if (targetPage) {
                targetPage.classList.add('active');
            }
        });
    });

    // Chat Tabs
    const chatTabs = document.querySelectorAll('.chat-tab');
    chatTabs.forEach(tab => {
        tab.addEventListener('click', function() {
            chatTabs.forEach(t => t.classList.remove('active'));
            this.classList.add('active');
        });
    });

    // Chat Items
    const chatItems = document.querySelectorAll('.chat-item');
    chatItems.forEach(item => {
        item.addEventListener('click', function() {
            chatItems.forEach(i => i.classList.remove('active'));
            this.classList.add('active');
        });
    });

    // Integration Tabs
    const tabs = document.querySelectorAll('.tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', function() {
            tabs.forEach(t => t.classList.remove('active'));
            this.classList.add('active');
        });
    });

    // Flow Builder - Drag and Drop (basic)
    const flowNodes = document.querySelectorAll('.flow-node');
    flowNodes.forEach(node => {
        let isDragging = false;
        let offsetX, offsetY;

        node.addEventListener('mousedown', function(e) {
            isDragging = true;
            offsetX = e.clientX - node.offsetLeft;
            offsetY = e.clientY - node.offsetTop;
            node.style.zIndex = 1000;
        });

        document.addEventListener('mousemove', function(e) {
            if (!isDragging) return;
            node.style.left = (e.clientX - offsetX) + 'px';
            node.style.top = (e.clientY - offsetY) + 'px';
        });

        document.addEventListener('mouseup', function() {
            isDragging = false;
            node.style.zIndex = '';
        });
    });

    // Kanban Drag (basic)
    const kanbanCards = document.querySelectorAll('.kanban-card');
    kanbanCards.forEach(card => {
        card.setAttribute('draggable', 'true');

        card.addEventListener('dragstart', function(e) {
            e.dataTransfer.setData('text/plain', '');
            card.style.opacity = '0.5';
        });

        card.addEventListener('dragend', function() {
            card.style.opacity = '1';
        });
    });

    const kanbanColumns = document.querySelectorAll('.kanban-column');
    kanbanColumns.forEach(column => {
        column.addEventListener('dragover', function(e) {
            e.preventDefault();
            column.style.background = 'rgba(59, 130, 246, 0.05)';
        });

        column.addEventListener('dragleave', function() {
            column.style.background = '';
        });

        column.addEventListener('drop', function(e) {
            e.preventDefault();
            column.style.background = '';
        });
    });

    // Modal functions
    window.openModal = function(modalId) {
        document.getElementById(modalId).classList.add('active');
    };

    window.closeModal = function(modalId) {
        document.getElementById(modalId).classList.remove('active');
    };

    // Close modal on overlay click
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', function(e) {
            if (e.target === overlay) {
                overlay.classList.remove('active');
            }
        });
    });

    // Tooltip
    const tooltipElements = document.querySelectorAll('[data-tooltip]');
    tooltipElements.forEach(el => {
        el.addEventListener('mouseenter', function() {
            const tooltip = document.createElement('div');
            tooltip.className = 'tooltip';
            tooltip.textContent = this.getAttribute('data-tooltip');
            tooltip.style.cssText = `
                position: absolute;
                background: var(--bg-dark);
                color: var(--text);
                padding: 6px 12px;
                border-radius: 6px;
                font-size: 12px;
                z-index: 1000;
                white-space: nowrap;
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            `;
            document.body.appendChild(tooltip);

            const rect = this.getBoundingClientRect();
            tooltip.style.left = rect.left + 'px';
            tooltip.style.top = (rect.top - 40) + 'px';

            this._tooltip = tooltip;
        });

        el.addEventListener('mouseleave', function() {
            if (this._tooltip) {
                this._tooltip.remove();
            }
        });
    });

    // Search functionality
    const searchInputs = document.querySelectorAll('.search-box input');
    searchInputs.forEach(input => {
        input.addEventListener('input', function() {
            const query = this.value.toLowerCase();
            // Add search logic here
        });
    });

    // Notification badge animation
    const badges = document.querySelectorAll('.nav-badge');
    badges.forEach(badge => {
        setInterval(() => {
            badge.style.transform = 'scale(1.1)';
            setTimeout(() => {
                badge.style.transform = 'scale(1)';
            }, 200);
        }, 5000);
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', function(e) {
        // Cmd/Ctrl + K for search
        if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
            e.preventDefault();
            document.querySelector('.search-box input').focus();
        }

        // Escape to close modals
        if (e.key === 'Escape') {
            document.querySelectorAll('.modal-overlay.active').forEach(modal => {
                modal.classList.remove('active');
            });
        }
    });

    // Auto-resize textarea
    document.querySelectorAll('.form-textarea').forEach(textarea => {
        textarea.addEventListener('input', function() {
            this.style.height = 'auto';
            this.style.height = this.scrollHeight + 'px';
        });
    });

    console.log('🚀 Ozion Chat AI initialized');
});
