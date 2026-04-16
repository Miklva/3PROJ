# 3PROJ
Depôt GIT pour le projet d'année 3PROJ

# Initialisation
Créer un dossier sur son pc
Ouvrir un terminal dans ce dossier:
``Terminal 
- git clone https://github.com/Miklva/3PROJ.git
- cd ./server
- npm install
Installer Github Dekstop puis cloner le repository
# Lancement 
Lancer Docker Desktop
Ce placer dans le dossier /3PROJ:
``Terminal 
- docker compose up --build

``Web
- http://localhost:3000/

``Server
-Pour un probleme d'un module non trouvé tapez les commande suivante :
docker-compose down
docker-compose build --no-cache
docker-compose up
