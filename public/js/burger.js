   
            const burgerMenu = document.getElementById('burger-menu');
            const navbarContent = document.getElementById('unique-navbar-content');
            const closeMenuIcon = document.getElementById('close-menu-icon');

            function toggleMenu() {
                const isActive = navbarContent.classList.contains('active');
                navbarContent.classList.toggle('active', !isActive);
                burgerMenu.classList.toggle('active', !isActive);
                closeMenuIcon.classList.toggle('active', !isActive);
            }

            burgerMenu.addEventListener('click', toggleMenu);
            closeMenuIcon.addEventListener('click', toggleMenu);

  
            window.addEventListener('resize', function () {
                if (window.innerWidth > 1050) {
                    navbarContent.classList.remove('active');
                    burgerMenu.classList.remove('active');
                    closeMenuIcon.classList.remove('active');
                }
            });