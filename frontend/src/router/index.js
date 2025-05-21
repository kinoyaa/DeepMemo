import { createRouter, createWebHistory } from 'vue-router';
import Layout from '../components/Layout.vue';
import VocabBookList from '../components/VocabBookList.vue';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      component: Layout,
      children: [
        {
          path: 'books',
          name: 'books',
          component: VocabBookList
        },
        // {
        //   path: 'books/:id/learn',
        //   name: 'learning',
        //   component: Learning
        // }
      ]
    }
  ]
});

export default router;
