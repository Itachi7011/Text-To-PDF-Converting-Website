document.addEventListener('DOMContentLoaded', function () {
    // Dark Mode Toggle
    const themeSwitch = document.getElementById('theme-switch');
    const body = document.body;

    // Check if user has a theme preference in localStorage
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        body.classList.add('dark-mode');
    }

    themeSwitch.addEventListener('click', function () {
        body.classList.toggle('dark-mode');
        // Save theme preference
        if (body.classList.contains('dark-mode')) {
            localStorage.setItem('theme', 'dark');
        } else {
            localStorage.setItem('theme', 'light');
        }
    });

    // File Upload Functionality
    const dropArea = document.getElementById('drop-area');
    const fileUpload = document.getElementById('file-upload');
    const fileDetails = document.getElementById('file-details');
    const fileInfo = document.querySelector('.file-info');
    const fileName = document.getElementById('file-name');
    const fileSize = document.getElementById('file-size');
    const previewContent = document.querySelector('.preview-content');
    const convertBtn = document.getElementById('convert-btn');
    const clearBtn = document.getElementById('clear-btn');

    let currentFile = null;

    // Prevent default behavior for drag events
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    // Highlight drop area when item is dragged over it
    ['dragenter', 'dragover'].forEach(eventName => {
        dropArea.addEventListener(eventName, highlight, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, unhighlight, false);
    });

    function highlight() {
        dropArea.classList.add('active');
    }

    function unhighlight() {
        dropArea.classList.remove('active');
    }

    // Handle dropped files
    dropArea.addEventListener('drop', handleDrop, false);

    function handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;

        if (files.length > 0) {
            handleFiles(files);
        }
    }

    // Handle file selection via upload button
    fileUpload.addEventListener('change', function () {
        if (this.files.length > 0) {
            handleFiles(this.files);
        }
    });

    function handleFiles(files) {
        const file = files[0];
        currentFile = file;

        // Show file info
        fileName.textContent = file.name;
        fileSize.textContent = `Size: ${formatFileSize(file.size)}`;
        fileInfo.classList.remove('hidden');

        // Read file content for preview
        const reader = new FileReader();
        reader.onload = function (e) {
            // Show only first 500 characters in preview
            const fullText = e.target.result;
            const previewText = fullText.length > 500 ?
                fullText.substring(0, 500) + '...' :
                fullText;
            previewContent.textContent = previewText;
        };
        reader.readAsText(file);
    }

    // Format file size
    function formatFileSize(bytes) {
        if (bytes < 1024) {
            return bytes + ' bytes';
        } else if (bytes < 1048576) {
            return (bytes / 1024).toFixed(1) + ' KB';
        } else {
            return (bytes / 1048576).toFixed(1) + ' MB';
        }
    }

    // Convert file to PDF
    convertBtn.addEventListener('click', function () {
        if (currentFile) {
            convertToPDF(currentFile);
        }
    });

    // Clear selection
    clearBtn.addEventListener('click', function () {
        currentFile = null;
        fileInfo.classList.add('hidden');
        fileUpload.value = '';
        previewContent.textContent = '';
    });

    // Function to convert text to PDF
    function convertToPDF(file) {
        const reader = new FileReader();

        reader.onload = function (e) {
            const text = e.target.result;

            // Create PDF using jsPDF
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();

            // Set font styles
            doc.setFont('helvetica', 'normal');

            // Parse text and format
            const lines = text.split('\n');
            const parsedContent = parseTextContent(lines);

            // Add content to PDF
            let y = 20;
            let pageHeight = doc.internal.pageSize.height;

            parsedContent.forEach(item => {
                // Check if need new page
                if (y > pageHeight - 20) {
                    doc.addPage();
                    y = 20;
                }

                // Apply formatting based on content type
                switch (item.type) {
                    case 'title':
                        doc.setFontSize(24);
                        doc.setFont('helvetica', 'bold');
                        doc.text(item.text, 20, y);
                        y += 12;
                        break;

                    case 'subtitle':
                        doc.setFontSize(18);
                        doc.setFont('helvetica', 'bold');
                        doc.text(item.text, 20, y);
                        y += 10;
                        break;

                    case 'paragraph':
                        doc.setFontSize(12);
                        doc.setFont('helvetica', 'normal');

                        // Split long paragraphs
                        const splitText = doc.splitTextToSize(item.text, 170);
                        doc.text(splitText, 20, y);
                        y += (splitText.length * 7) + 5;
                        break;

                    case 'list-item':
                        doc.setFontSize(12);
                        doc.setFont('helvetica', 'normal');
                        doc.text(`• ${item.text}`, 25, y);
                        y += 7;
                        break;
                }
            });

            // Save the PDF
            const fileName = file.name.replace(/\.[^/.]+$/, "") + '.pdf';
            doc.save(fileName);

            // Show success message
            showNotification('PDF created successfully!');
        };

        reader.readAsText(file);
    }

    // Function to parse text content and identify structure
    function parseTextContent(lines) {
        const parsedContent = [];
        let inList = false;

        lines.forEach((line, index) => {
            const trimmedLine = line.trim();

            // Skip empty lines
            if (trimmedLine === '') {
                inList = false;
                return;
            }

            // Check if it's a title (all caps or ends with specific characters)
            if ((trimmedLine === trimmedLine.toUpperCase() && trimmedLine.length > 4) ||
                (trimmedLine.endsWith(':') && index === 0)) {
                parsedContent.push({ type: 'title', text: trimmedLine });
            }
            // Check if it's a subtitle (ends with colon or has special beginning)
            else if (trimmedLine.endsWith(':') ||
                (trimmedLine.startsWith('#') && !trimmedLine.startsWith('##')) ||
                (trimmedLine.length < 50 && index > 0 && lines[index - 1].trim() === '')) {
                parsedContent.push({ type: 'subtitle', text: trimmedLine.replace(/^#\s*/, '') });
            }
            // Check if it's a list item
            else if (trimmedLine.startsWith('-') || trimmedLine.startsWith('*') ||
                /^\d+[\.\)]/.test(trimmedLine)) {
                inList = true;
                parsedContent.push({
                    type: 'list-item',
                    text: trimmedLine.replace(/^[-*]\s*|^\d+[\.\)]\s*/, '')
                });
            }
            // Otherwise it's a paragraph
            else {
                parsedContent.push({ type: 'paragraph', text: trimmedLine });
            }
        });

        return parsedContent;
    }

    // Function to show notification
    function showNotification(message) {
        const notification = document.createElement('div');
        notification.className = 'notification';
        notification.textContent = message;

        document.body.appendChild(notification);

        // Fade in
        setTimeout(() => {
            notification.classList.add('show');
        }, 10);

        // Fade out and remove
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 3000);
    }

    // 3D cube animation
    const cube = document.querySelector('.cube');
    if (cube) {
        let rotateX = 0;
        let rotateY = 0;

        function rotateCube() {
            rotateY += 0.5;
            if (rotateY >= 360) rotateY = 0;

            cube.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
            requestAnimationFrame(rotateCube);
        }

        rotateCube();

        // Pause rotation on hover
        cube.addEventListener('mouseenter', () => {
            cube.style.animationPlayState = 'paused';
        });

        cube.addEventListener('mouseleave', () => {
            cube.style.animationPlayState = 'running';
        });
    }

    // Add animation to feature cards
    const featureCards = document.querySelectorAll('.feature-card');

    const observerOptions = {
        threshold: 0.2,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    featureCards.forEach(card => {
        observer.observe(card);
    });
});