# Campus Connect Hub

App Name: Campus Connect

Purpose: A school/community app where students can post updates/tasks, sell products/services via escrow, chat across departments, predict event outcomes, and engage with a mini-game.

Login & Accounts:
- Students log in using:
  - Department
  - Level
  - Full Name
- Profiles include: name, department, level, avatar, bio.
- Students can see other students in their department (all levels).
- Students can also see/search students from other departments.
- Option to post anonymously.

Screens:

1. Home Feed / Updates:
   - Post suggestions, updates, or anonymous messages.
   - Likes, comments, and timestamps visible.
   - Option to post anonymously.
   - Button: Create Post.

2. Create Post:
   - Form: Title, Content, Option to post anonymously.
   - Optional image/video upload.
   - Button: Publish.

3. Tasks:
   - Students can post tasks for other students.
   - Task includes: title, description, reward (money/item), optional image.
   - Button: Accept Task.
   - Button: Mark Task Completed (notifies poster).

4. Marketplace:
   - Students can sell products/services.
   - Listing includes: title, description, price, image, seller info.
   - **Escrow system:** Buyer sends money to middleman (app admin); seller delivers product/service; admin releases payment to seller.
   - Users can like, comment, or message seller.
   - Filter/search by category, price, or trending.
   - Button: Create Listing.

5. Create Listing:
   - Form: Product/Service Name, Description, Price, Upload Image.
   - Button: Publish Listing.

6. Chat:
   - **Department chat groups**: Students can chat with anyone in their department across all levels.
   - **Global chat**: Students can chat with students from other departments.
   - **Private one-on-one chat** optional.
   - Emoji reactions, stickers, GIFs supported.
   - Button: Send Message.

7. Event Predictions:
   - List of upcoming events (sports, competitions, elections).
   - Students submit predictions (vote/guess outcome).
   - Show results after the event.
   - Button: Submit Prediction.

8. Mini-Game:
   - A simple, addictive game for student engagement.
   - Examples:
     - **Memory Tiles:** Flip tiles to match pairs as fast as possible.
     - **Tap Challenge:** Tap moving objects quickly for points within a time limit.
     - **Quiz Game:** Quick multiple-choice school/fun questions with a leaderboard.
   - Leaderboard shows top scores among students.
   - Daily reward points for playing that can be used in app (like unlocking features or marketplace perks).
   - Button: Play Now.

9. Profile:
   - Shows student info, posts, tasks, listings, predictions history, and mini-game scores.
   - Edit Profile button.

Features:
- Push notifications for new posts, tasks, marketplace updates, chat messages, or events.
- Likes, comments, shares for posts and marketplace items.
- Anonymous posting option.
- Dark/light mode toggle.
- Trending posts or featured marketplace items.
- Secure login system by department, level, and name.
- Escrow-style payment system with middleman (app admin).
- Search and filter in feed, marketplace, and predictions.
- Department grouping for visibility but **cross-department communication allowed**.
- Mini-game leaderboard for engagement.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
